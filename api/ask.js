// api/ask.js

import { config } from "dotenv";
import axios from "axios";

config();

// Simple in-memory rate limiting (not for production)
const rateLimitMap = new Map();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  // Simple rate limiting by IP
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
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an educational assistant that helps students and parents learn about colleges and universities. Provide detailed, accurate, and up-to-date information about college names, locations, programs, admission requirements, fees, rankings, facilities, scholarships, and application procedures. Always explain things clearly and politely, and avoid giving personal opinions.",
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
    res.status(200).json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to get response from OpenAI" });
  }
}
