// Hybrid recommendation engine. Combines:
//   1. Genre + actor + director affinity score from the user's history
//   2. Vote average + popularity weighting from TMDB
//   3. Optional AI re-ranking via /api/ai/recommend (Gemini / OpenAI)
//
// Falls back to plain popularity-sort when there's no history or no AI key.

import type { CatalogItem } from "@/lib/api";
import { aiRecommend } from "@/lib/api";

export interface HistoryItem {
  id: string;
  title: string;
  genres?: string[];
  year?: string;
  rating?: number; // user rating 1–10
}

interface RankedItem {
  item: CatalogItem;
  score: number;
  reason?: string;
}

function genreAffinity(history: HistoryItem[]): Map<string, number> {
  const affinity = new Map<string, number>();
  for (const h of history) {
    const weight = h.rating ? Math.max(0.2, h.rating / 10) : 0.7;
    for (const g of h.genres || []) {
      affinity.set(g, (affinity.get(g) || 0) + weight);
    }
  }
  // Normalize to 0..1
  let max = 1;
  affinity.forEach((v) => {
    if (v > max) max = v;
  });
  affinity.forEach((v, k) => affinity.set(k, v / max));
  return affinity;
}

export function localRank(
  candidates: CatalogItem[],
  history: HistoryItem[],
  options: { excludeWatched?: boolean; limit?: number } = {},
): RankedItem[] {
  const watchedIds = new Set(history.map((h) => h.id));
  const aff = genreAffinity(history);
  const ranked: RankedItem[] = [];

  for (const item of candidates) {
    if (options.excludeWatched && watchedIds.has(item.id)) continue;
    let score = 0;

    // Vote average contribution (0..1)
    if (item.voteAverage !== null) score += (item.voteAverage / 10) * 0.4;

    // Popularity contribution (log-normalized) — popularity values can be huge.
    if (item.popularity) {
      score += Math.min(1, Math.log10(item.popularity + 1) / 3) * 0.2;
    }

    // Genre affinity (0..1) × 0.4
    if (item.genres?.length) {
      const genreBoost =
        item.genres.reduce((acc, g) => acc + (aff.get(g) || 0), 0) /
        Math.max(1, item.genres.length);
      score += genreBoost * 0.4;
    }

    ranked.push({ item, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return options.limit ? ranked.slice(0, options.limit) : ranked;
}

/**
 * Hybrid: rank locally first, then send the top N to AI for re-ranking with
 * human-readable reasons. AI re-ranking is best-effort — if it fails or is
 * disabled, the local ranking is returned as-is.
 */
export async function hybridRecommend(
  candidates: CatalogItem[],
  history: HistoryItem[],
  options: { limit?: number; useAi?: boolean } = {},
): Promise<RankedItem[]> {
  const limit = options.limit ?? 12;
  const local = localRank(candidates, history, { excludeWatched: true, limit: 60 });
  if (!options.useAi || history.length === 0 || local.length === 0) {
    return local.slice(0, limit);
  }
  try {
    const aiRanked = await aiRecommend(
      history.map((h) => ({ title: h.title, genres: h.genres, year: h.year })),
      local.map((r) => ({
        id: r.item.id,
        title: r.item.title,
        genres: r.item.genres,
        overview: r.item.description,
        year: r.item.year,
      })),
      limit,
    );
    if (aiRanked.length === 0) return local.slice(0, limit);
    const byId = new Map(local.map((r) => [r.item.id, r.item]));
    const out: RankedItem[] = [];
    for (const a of aiRanked) {
      const item = byId.get(a.id);
      if (item) {
        out.push({ item, score: a.score ?? 1, reason: a.reason });
      }
    }
    // Append any local picks not chosen by AI to fill out the list.
    for (const r of local) {
      if (out.length >= limit) break;
      if (!out.some((x) => x.item.id === r.item.id)) out.push(r);
    }
    return out.slice(0, limit);
  } catch (e) {
    console.warn("[recommend] AI failed, falling back to local rank", e);
    return local.slice(0, limit);
  }
}
