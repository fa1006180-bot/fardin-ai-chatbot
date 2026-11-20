import express from "express";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { readDB, writeDB } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function getAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  });
}

function buildLLMContent(msg) {
  const hasImages = msg.attachments?.some((a) => a.type === "image");
  const textFiles = msg.attachments?.filter((a) => a.type === "text") || [];

  let combinedText = msg.content || "";
  if (textFiles.length > 0) {
    const fileContext = textFiles
      .map(
        (f) =>
          `\n\n--- Attached File: ${f.name} ---\n${f.content}\n--- End of ${f.name} ---`
      )
      .join("");
    combinedText += fileContext;
  }

  if (hasImages) {
    const parts = [];
    if (combinedText.trim()) {
      parts.push({ type: "text", text: combinedText });
    }
    for (const att of msg.attachments) {
      if (att.type === "image" && att.dataUrl) {
        parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
      }
    }
    return parts;
  }

  return combinedText;
}

function buildGeminiParts(msg) {
  const parts = [];
  const textFiles = msg.attachments?.filter((a) => a.type === "text") || [];

  let combinedText = msg.content || "";
  if (textFiles.length > 0) {
    combinedText += textFiles
      .map(
        (f) =>
          `\n\n--- Attached File: ${f.name} ---\n${f.content}\n--- End of ${f.name} ---`
      )
      .join("");
  }

  if (combinedText.trim()) {
    parts.push({ text: combinedText });
  }

  for (const att of msg.attachments || []) {
    if (att.type === "image" && att.dataUrl) {
      const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(att.dataUrl);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }
  }

  return parts.length > 0 ? parts : [{ text: " " }];
}

function sendSSE(res, payload) {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

router.post("/stream", authenticateToken, async (req, res) => {
  const {
    chatId,
    message,
    attachments = [],
    regenerate = false,
    editMessageId = null,
    model,
    systemPrompt,
    temperature = 0.7,
  } = req.body;

  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_api_key_here") {
    return res.status(500).json({
      error: "AI_API_KEY is not configured in server/.env file.",
    });
  }

  const db = readDB();
  let chat = chatId
    ? db.chats.find((c) => c.id === chatId && c.userId === req.user.id)
    : null;

  if (!chat) {
    const now = new Date().toISOString();
    chat = {
      id: uuidv4(),
      userId: req.user.id,
      title: "New Chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    db.chats.push(chat);
  }

  if (editMessageId) {
    const editIdx = chat.messages.findIndex((m) => m.id === editMessageId);
    if (editIdx === -1) {
      return res.status(404).json({ error: "Message to edit not found." });
    }
    chat.messages = chat.messages.slice(0, editIdx + 1);
    chat.messages[editIdx].content = message;
    chat.messages[editIdx].editedAt = new Date().toISOString();
  } else if (regenerate) {
    if (
      chat.messages.length > 0 &&
      chat.messages[chat.messages.length - 1].role === "assistant"
    ) {
      chat.messages.pop();
    }
  } else {
    if (!message?.trim() && attachments.length === 0) {
      return res
        .status(400)
        .json({ error: "Message or attachment is required." });
    }
    chat.messages.push({
      id: uuidv4(),
      role: "user",
      content: message?.trim() || "",
      attachments,
      createdAt: new Date().toISOString(),
    });
  }

  if (chat.title === "New Chat") {
    const firstUserMsg = chat.messages.find((m) => m.role === "user");
    if (firstUserMsg?.content) {
      const cleanTitle = firstUserMsg.content.replace(/\s+/g, " ").trim();
      chat.title =
        cleanTitle.length > 42 ? `${cleanTitle.slice(0, 42)}...` : cleanTitle;
    } else if (firstUserMsg?.attachments?.length) {
      chat.title = `File: ${firstUserMsg.attachments[0].name}`;
    }
  }

  chat.updatedAt = new Date().toISOString();
  await writeDB(db);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const assistantMessageId = uuidv4();
  sendSSE(res, {
    type: "meta",
    chatId: chat.id,
    title: chat.title,
    assistantMessageId,
    messages: chat.messages,
  });

  const defaultSystemInstruction =
    systemPrompt?.trim() ||
    "You are Fardin AI, a helpful, accurate, and intelligent AI assistant. Format responses cleanly using Markdown when appropriate.";

  const activeModel =
    model?.trim() || process.env.AI_DEFAULT_MODEL || "gemini-3.8-flash";
  const abortController = new AbortController();

  let clientDisconnected = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      abortController.abort();
    }
  });

  const isNativeGemini =
    apiKey.startsWith("AQ.") ||
    apiKey.startsWith("AIza") ||
    process.env.AI_BASE_URL?.includes("generativelanguage.googleapis.com");

  let fullReply = "";

  try {
    if (isNativeGemini) {
      // Native Google Gemini Streaming API (supports AQ. and AIza keys)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?alt=sse`;
      const geminiBody = {
        systemInstruction: { parts: [{ text: defaultSystemInstruction }] },
        contents: chat.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts:
            m.role === "user"
              ? buildGeminiParts(m)
              : [{ text: m.content || " " }],
        })),
        generationConfig: {
          temperature: Number(temperature) || 0.7,
        },
      };

      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(geminiBody),
        signal: abortController.signal,
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API Error (${geminiRes.status}): ${errText}`);
      }

      const reader = geminiRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        if (clientDisconnected) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta =
              parsed?.candidates?.[0]?.content?.parts
                ?.map((p) => p.text || "")
                .join("") || "";
            if (delta) {
              fullReply += delta;
              sendSSE(res, { type: "delta", content: delta });
            }
          } catch {
            // Ignore partial JSON chunk
          }
        }
      }
    } else {
      // OpenAI / Groq compatible streaming
      const formattedMessages = [
        { role: "system", content: defaultSystemInstruction },
        ...chat.messages.map((m) => ({
          role: m.role,
          content: m.role === "user" ? buildLLMContent(m) : m.content,
        })),
      ];

      const openai = getAIClient();
      const stream = await openai.chat.completions.create(
        {
          model: activeModel,
          messages: formattedMessages,
          temperature: Number(temperature) || 0.7,
          stream: true,
        },
        { signal: abortController.signal }
      );

      for await (const chunk of stream) {
        if (clientDisconnected) break;
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullReply += delta;
          sendSSE(res, { type: "delta", content: delta });
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError" && !clientDisconnected) {
      console.error("AI Streaming Error:", err);
      sendSSE(res, {
        type: "error",
        error:
          err?.message ||
          "Failed to generate AI response. Check your API key and model name.",
      });
    }
  } finally {
    if (fullReply.trim().length > 0) {
      const latestDB = readDB();
      const targetChat = latestDB.chats.find((c) => c.id === chat.id);
      if (targetChat) {
        targetChat.messages.push({
          id: assistantMessageId,
          role: "assistant",
          content: fullReply,
          model: activeModel,
          createdAt: new Date().toISOString(),
        });
        targetChat.updatedAt = new Date().toISOString();
        await writeDB(latestDB);
      }
    }

    if (!clientDisconnected) {
      sendSSE(res, { type: "done", chatId: chat.id });
      res.end();
    }
  }
});

export default router;