// api/ask.js
import { config } from "dotenv";
import axios from "axios";

config(); // Load .env on local dev

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o", // or gpt-3.5-turbo for cheaper
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
