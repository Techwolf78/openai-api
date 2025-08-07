// /api/chat.js (or /api/ask-ai.js for your component)
import { config } from "dotenv";
import axios from "axios";

config();

// In-memory rate limiting (basic)
const rateLimitMap = new Map();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173"); // Adjust in prod
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  // Parse JSON body if needed
  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { count: 1, start: now };
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful, friendly, and knowledgeable AI assistant. Your goal is to answer user questions naturally and accurately, like ChatGPT. Use a conversational tone. Ask clarifying questions when needed. Be detailed but clear.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 1.0,
        max_tokens: 2048,
        top_p: 1.0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = openaiRes.data.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Failed to fetch response from OpenAI." });
  }
}
