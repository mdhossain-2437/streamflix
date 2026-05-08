// Unified AI provider — uses Gemini (free tier) by default and falls back to
// OpenAI if GEMINI_API_KEY is missing but OPENAI_API_KEY is present. All
// endpoints return 503 with { configured: false } when neither key is set so
// the client can render disabled placeholders.
//
// Endpoints:
//   GET  /api/ai/status                — provider, model, configured
//   POST /api/ai/recommend             — rank candidates from watch history
//   POST /api/ai/semantic-search       — natural-language → structured query
//   POST /api/ai/translate-vtt         — translate WebVTT dialogue
//   POST /api/ai/explain               — spoiler-free critic deep-dive
//   POST /api/ai/chat                  — chat-with-movie / Q&A
//   POST /api/ai/summarize-reviews     — distill OMDb / TMDB reviews into pros/cons
//
// Provider rules:
//   - Gemini call uses generativelanguage.googleapis.com REST endpoint.
//   - Caches all responses by request hash for 6h.

import type { Express, Request, Response } from "express";
import crypto from "crypto";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_BASE = "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_INPUT_CHARS = 24_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOpts {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

type Provider = "gemini" | "openai" | null;

function activeProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function activeModel(): string {
  return activeProvider() === "gemini" ? GEMINI_MODEL : OPENAI_MODEL;
}

const cache = new Map<string, { value: string; expires: number }>();

function cacheKey(messages: ChatMessage[], opts: ChatOpts): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ messages, opts, p: activeProvider() }))
    .digest("hex");
}

async function geminiCall(messages: ChatMessage[], opts: ChatOpts): Promise<string> {
  const systemPrompts = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const conversation = messages.filter((m) => m.role !== "system");
  const contents = conversation.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 1500,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemPrompts) {
    body.systemInstruction = { parts: [{ text: systemPrompts }] };
  }
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY!)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return text;
}

async function openaiCall(messages: ChatMessage[], opts: ChatOpts): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
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

async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = cacheKey(messages, opts);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const provider = activeProvider();
  if (!provider) throw new Error("No AI provider configured");
  const value = provider === "gemini" ? await geminiCall(messages, opts) : await openaiCall(messages, opts);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function parseJsonLoose<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  // Strip markdown fences if the model added any.
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the first {...} or [...] block.
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {}
    }
    return fallback;
  }
}

export function registerAiRoutes(app: Express): void {
  app.get("/api/ai/status", (_req: Request, res: Response) => {
    const provider = activeProvider();
    res.json({
      configured: !!provider,
      provider,
      model: provider ? activeModel() : null,
    });
  });

  if (!activeProvider()) {
    const stub = (_req: Request, res: Response) =>
      res.status(503).json({ configured: false, message: "AI provider not configured (set GEMINI_API_KEY or OPENAI_API_KEY)" });
    app.post("/api/ai/recommend", stub);
    app.post("/api/ai/semantic-search", stub);
    app.post("/api/ai/translate-vtt", stub);
    app.post("/api/ai/explain", stub);
    app.post("/api/ai/chat", stub);
    app.post("/api/ai/summarize-reviews", stub);
    return;
  }

  // Personalized recommendations: takes a list of watched titles (with genres /
  // ratings) and a candidate pool, asks the model to pick & rank with reasons.
  app.post("/api/ai/recommend", async (req: Request, res: Response) => {
    try {
      const { history = [], candidates = [], limit = 12 } = req.body as {
        history?: Array<{ title: string; genres?: string[]; rating?: number; year?: string }>;
        candidates?: Array<{ id: string; title: string; genres?: string[]; overview?: string; year?: string }>;
        limit?: number;
      };
      if (candidates.length === 0) return res.json({ items: [] });

      const trimmed = candidates.slice(0, 80);
      const prompt = [
        "You are an expert film & TV recommender for a streaming app.",
        "Given the user's watch history, pick the most relevant items from CANDIDATES.",
        `Return strict JSON: { "items": [{ "id": string, "reason": string, "score": number }] }`,
        `Limit to ${limit} items, sorted by score desc (0..1). "reason" = one short sentence.`,
        "",
        "WATCH HISTORY:",
        history
          .slice(-30)
          .map((h) => `- ${h.title}${h.year ? ` (${h.year})` : ""}${h.genres ? ` [${h.genres.join(", ")}]` : ""}`)
          .join("\n") || "(none yet)",
        "",
        "CANDIDATES:",
        trimmed
          .map(
            (c) =>
              `- id=${c.id} | ${c.title}${c.year ? ` (${c.year})` : ""}${c.genres ? ` [${c.genres.join(", ")}]` : ""} | ${(c.overview || "").slice(0, 160)}`,
          )
          .join("\n"),
      ].join("\n");

      const out = await chat(
        [
          { role: "system", content: "You output strict JSON only. No prose, no markdown fences." },
          { role: "user", content: prompt },
        ],
        { temperature: 0.5, jsonMode: true, maxTokens: 1500 },
      );
      type Item = { id: string; reason: string; score?: number };
      const parsed = parseJsonLoose<{ items?: Item[] }>(out, { items: [] });
      res.json({ items: (parsed.items || []).slice(0, limit) });
    } catch (e) {
      console.error("[ai] recommend", e);
      res.status(502).json({ message: "AI recommendation failed" });
    }
  });

  // Semantic search: convert a natural-language query into a structured TMDB
  // discover request that the client can issue.
  app.post("/api/ai/semantic-search", async (req: Request, res: Response) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Missing 'query' (string)" });
      }
      const prompt = [
        "Translate the user's natural-language film/TV request into structured discover filters.",
        "Return strict JSON with this shape (omit fields you cannot infer):",
        `{
  "kind": "movie" | "tv",
  "genres": string[],
  "yearFrom": number,
  "yearTo": number,
  "minRating": number,
  "language": string,        // ISO 639-1
  "keywords": string[],      // free-text TMDB keywords
  "withCast": string[],      // actor / director names
  "sort": "popularity" | "vote_average" | "release_date" | "revenue",
  "explanation": string      // one sentence explaining your interpretation
}`,
        `User query: """${query}"""`,
      ].join("\n");

      const out = await chat(
        [
          { role: "system", content: "You output strict JSON only. No prose, no markdown fences." },
          { role: "user", content: prompt },
        ],
        { temperature: 0.3, jsonMode: true, maxTokens: 600 },
      );
      const parsed = parseJsonLoose<Record<string, unknown>>(out, {});
      res.json(parsed);
    } catch (e) {
      console.error("[ai] semantic-search", e);
      res.status(502).json({ message: "AI semantic search failed" });
    }
  });

  // Translate a WebVTT subtitle blob to a target language.
  app.post("/api/ai/translate-vtt", async (req: Request, res: Response) => {
    try {
      const { vtt, targetLanguage = "Spanish" } = req.body as {
        vtt?: string;
        targetLanguage?: string;
      };
      if (!vtt || typeof vtt !== "string") {
        return res.status(400).json({ message: "Missing 'vtt' (string)" });
      }
      const trimmedVtt = vtt.slice(0, MAX_INPUT_CHARS);
      const out = await chat(
        [
          {
            role: "system",
            content:
              "You are a professional subtitle translator. Translate ONLY the dialogue lines of WebVTT files into the target language. Preserve every cue identifier, timecode, and blank line exactly. Never add commentary or explanations or markdown fences. Return the entire translated VTT body.",
          },
          {
            role: "user",
            content: `Target language: ${targetLanguage}\n\nVTT:\n${trimmedVtt}`,
          },
        ],
        { temperature: 0.2, maxTokens: 6000 },
      );
      res.json({ vtt: out, targetLanguage });
    } catch (e) {
      console.error("[ai] translate-vtt", e);
      res.status(502).json({ message: "AI translation failed" });
    }
  });

  // Spoiler-free deep dive: themes, tone, recommendation. 3-5 short paragraphs.
  app.post("/api/ai/explain", async (req: Request, res: Response) => {
    try {
      const { title, year, overview, kind = "movie" } = req.body as {
        title?: string;
        year?: string | number | null;
        overview?: string;
        kind?: "movie" | "series";
      };
      if (!title) return res.status(400).json({ message: "Missing 'title'" });
      const out = await chat(
        [
          {
            role: "system",
            content:
              "You are a thoughtful film & TV critic. Write a brief deep-dive: themes, tone, why it works (or doesn't), and a spoiler-free recommendation. 3-5 short paragraphs. No headings, no markdown.",
          },
          {
            role: "user",
            content: `${kind === "series" ? "TV series" : "Movie"}: ${title}${year ? ` (${year})` : ""}\n\nOfficial overview:\n${overview || "(none)"}`,
          },
        ],
        { temperature: 0.6, maxTokens: 800 },
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
      const out = await chat(
        [
          {
            role: "system",
            content: `You are a friendly, knowledgeable film critic helping a viewer talk about "${title}"${year ? ` (${year})` : ""}. The official overview is: ${overview || "(none provided)"}. Be concise (2-4 sentences unless asked otherwise). If asked about plot details you don't know, say so. Avoid spoilers unless explicitly asked.`,
          },
          ...messages.slice(-14),
        ],
        { temperature: 0.7, maxTokens: 700 },
      );
      res.json({ text: out });
    } catch (e) {
      console.error("[ai] chat", e);
      res.status(502).json({ message: "AI chat failed" });
    }
  });

  // Distill a list of reviews into pros / cons / consensus.
  app.post("/api/ai/summarize-reviews", async (req: Request, res: Response) => {
    try {
      const { title, reviews = [] } = req.body as {
        title?: string;
        reviews?: Array<{ author?: string; content: string; rating?: number | null }>;
      };
      if (!title || reviews.length === 0) {
        return res.status(400).json({ message: "Missing 'title' or 'reviews'" });
      }
      const trimmed = reviews
        .slice(0, 12)
        .map((r, i) => `[${i + 1}]${r.rating ? ` (${r.rating}/10)` : ""} ${r.content.slice(0, 800)}`)
        .join("\n\n");
      const prompt = [
        `Title: ${title}`,
        "Reviews:",
        trimmed,
        "",
        `Return strict JSON: { "consensus": string, "pros": string[], "cons": string[] }`,
        "Each list item is a short phrase (max ~12 words). 3-5 items per list.",
      ].join("\n");
      const out = await chat(
        [
          { role: "system", content: "You output strict JSON only." },
          { role: "user", content: prompt },
        ],
        { temperature: 0.4, jsonMode: true, maxTokens: 700 },
      );
      const parsed = parseJsonLoose<{ consensus?: string; pros?: string[]; cons?: string[] }>(out, {});
      res.json(parsed);
    } catch (e) {
      console.error("[ai] summarize-reviews", e);
      res.status(502).json({ message: "AI summarize-reviews failed" });
    }
  });
}
