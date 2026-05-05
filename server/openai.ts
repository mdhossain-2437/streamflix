// OpenAI features (gracefully disabled when OPENAI_API_KEY is missing).
// When the key is present, exposes:
//   POST /api/ai/recommend         - personalized recs from watch history
//   POST /api/ai/translate-vtt     - translate a WebVTT subtitle file
//   POST /api/ai/explain           - "what is this movie about" plot deep dive
//   POST /api/ai/chat              - chat-with-movie Q&A (with title context)
// All endpoints return 503 with { configured: false } when the key isn't set
// so the client can render disabled placeholders.

import type { Express, Request, Response } from "express";

const OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_INPUT_CHARS = 16_000;

function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean } = {},
): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1200,
      messages,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content || "";
}

export function registerOpenAiRoutes(app: Express): void {
  app.get("/api/ai/status", (_req: Request, res: Response) => {
    res.json({ configured: openaiConfigured(), model: DEFAULT_MODEL });
  });

  if (!openaiConfigured()) {
    const stub = (_req: Request, res: Response) =>
      res.status(503).json({ configured: false, message: "OPENAI_API_KEY not configured" });
    app.post("/api/ai/recommend", stub);
    app.post("/api/ai/translate-vtt", stub);
    app.post("/api/ai/explain", stub);
    app.post("/api/ai/chat", stub);
    return;
  }

  // Personalized recommendations: takes a list of watched titles (with genres /
  // ratings) and a candidate pool from TMDB, asks the model to pick & rank.
  app.post("/api/ai/recommend", async (req: Request, res: Response) => {
    try {
      const { history = [], candidates = [], limit = 10 } = req.body as {
        history?: Array<{ title: string; genres?: string[]; rating?: number }>;
        candidates?: Array<{ id: string; title: string; genres?: string[]; overview?: string }>;
        limit?: number;
      };
      if (candidates.length === 0) return res.json({ items: [] });

      const trimmedCandidates = candidates.slice(0, 60);
      const prompt = [
        "You are a film & TV recommendation engine for a streaming app.",
        "Given the user's recent watch history, pick the most relevant items from the candidate pool.",
        "Return strict JSON: { \"items\": [{ \"id\": string, \"reason\": string }] }",
        `Limit to ${limit} items. \"reason\" should be one short sentence.`,
        "",
        "WATCH HISTORY:",
        history
          .slice(-30)
          .map((h) => `- ${h.title}${h.genres ? ` (${h.genres.join(", ")})` : ""}`)
          .join("\n") || "(none yet)",
        "",
        "CANDIDATES:",
        trimmedCandidates
          .map(
            (c) =>
              `- id=${c.id} | ${c.title}${c.genres ? ` | ${c.genres.join(", ")}` : ""} | ${(c.overview || "").slice(0, 140)}`,
          )
          .join("\n"),
      ].join("\n");

      const out = await chatCompletion(
        [
          { role: "system", content: "You output strict JSON only." },
          { role: "user", content: prompt },
        ],
        { temperature: 0.5, jsonMode: true, maxTokens: 1200 },
      );

      type Item = { id: string; reason: string };
      let parsed: { items?: Item[] } = {};
      try {
        parsed = JSON.parse(out);
      } catch {
        parsed = { items: [] };
      }
      res.json({ items: (parsed.items || []).slice(0, limit) });
    } catch (e) {
      console.error("[ai] recommend", e);
      res.status(502).json({ message: "AI recommendation failed" });
    }
  });

  // Translate a WebVTT subtitle blob to a target language. Preserves cue
  // timestamps; only translates the text rows. Truncates inputs >16 KB.
  app.post("/api/ai/translate-vtt", async (req: Request, res: Response) => {
    try {
      const { vtt, targetLanguage = "Spanish" } = req.body as {
        vtt?: string;
        targetLanguage?: string;
      };
      if (!vtt || typeof vtt !== "string") {
        return res.status(400).json({ message: "Missing 'vtt' (string)" });
      }
      const trimmed = vtt.slice(0, MAX_INPUT_CHARS);
      const out = await chatCompletion(
        [
          {
            role: "system",
            content:
              "You are a professional subtitle translator. Translate ONLY the dialogue lines of WebVTT files into the target language. Preserve every cue identifier, timecode, and blank line exactly. Never add commentary or explanations. Return the entire translated VTT body.",
          },
          {
            role: "user",
            content: `Target language: ${targetLanguage}\n\nVTT:\n${trimmed}`,
          },
        ],
        { temperature: 0.2, maxTokens: 4000 },
      );
      res.json({ vtt: out, targetLanguage });
    } catch (e) {
      console.error("[ai] translate-vtt", e);
      res.status(502).json({ message: "AI translation failed" });
    }
  });

  // Plot deep-dive — explain themes, motifs, ending. Used for the "AI Notes"
  // tab on the detail page.
  app.post("/api/ai/explain", async (req: Request, res: Response) => {
    try {
      const { title, year, overview, kind = "movie" } = req.body as {
        title?: string;
        year?: string | number | null;
        overview?: string;
        kind?: "movie" | "series";
      };
      if (!title) return res.status(400).json({ message: "Missing 'title'" });
      const out = await chatCompletion(
        [
          {
            role: "system",
            content:
              "You are a thoughtful film & TV critic. Write a brief deep-dive: themes, tone, why it works (or doesn't), and a spoiler-free recommendation. Use 3-5 short paragraphs. No headings, no markdown.",
          },
          {
            role: "user",
            content: `${kind === "series" ? "TV series" : "Movie"}: ${title}${year ? ` (${year})` : ""}\n\nOfficial overview:\n${overview || "(none)"}`,
          },
        ],
        { temperature: 0.6, maxTokens: 700 },
      );
      res.json({ text: out });
    } catch (e) {
      console.error("[ai] explain", e);
      res.status(502).json({ message: "AI explain failed" });
    }
  });

  // Chat-with-movie. Stateless — client passes title + recent messages.
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { title, year, overview, messages = [] } = req.body as {
        title?: string;
        year?: string | number | null;
        overview?: string;
        messages?: ChatMessage[];
      };
      if (!title || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Missing 'title' or 'messages'" });
      }
      const out = await chatCompletion(
        [
          {
            role: "system",
            content: `You are a friendly, knowledgeable film critic helping a viewer talk about "${title}"${year ? ` (${year})` : ""}. The official overview is: ${overview || "(none provided)"}. Be concise. If asked about plot details you don't know, say so.`,
          },
          ...messages.slice(-12),
        ],
        { temperature: 0.7, maxTokens: 600 },
      );
      res.json({ text: out });
    } catch (e) {
      console.error("[ai] chat", e);
      res.status(502).json({ message: "AI chat failed" });
    }
  });
}
