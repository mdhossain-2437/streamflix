import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerTmdbRoutes } from "./tmdb";
import {
  insertContentSchema,
  insertWatchlistSchema,
  insertViewingProgressSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // TMDB metadata proxy (real movie/series data when TMDB_API_KEY is set)
  registerTmdbRoutes(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Content routes
  app.get("/api/content/featured", async (_req, res) => {
    try {
      const content = await storage.getFeaturedContent();
      res.json(content || null);
    } catch (error) {
      console.error("Error fetching featured content:", error);
      res.status(500).json({ message: "Failed to fetch featured content" });
    }
  });

  app.get("/api/content/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const content = await storage.getTrendingContent(limit);
      res.json(content);
    } catch (error) {
      console.error("Error fetching trending content:", error);
      res.status(500).json({ message: "Failed to fetch trending content" });
    }
  });

  app.get("/api/content/similar/:id", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const content = await storage.getSimilarContent(req.params.id, limit);
      res.json(content);
    } catch (error) {
      console.error("Error fetching similar content:", error);
      res.status(500).json({ message: "Failed to fetch similar content" });
    }
  });

  app.get("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/content", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const genresParam = req.query.genres as string | string[] | undefined;
      const genres = genresParam
        ? Array.isArray(genresParam)
          ? genresParam
          : [genresParam]
        : undefined;
      const sort = req.query.sort as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const content = await storage.getAllContent({ type, genres, sort, limit });
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", isAuthenticated, async (req, res) => {
    try {
      const validated = insertContentSchema.parse(req.body);
      const content = await storage.createContent(validated);
      res.json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  app.patch("/api/content/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getContent(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }
      const validated = insertContentSchema.partial().parse(req.body);
      const content = await storage.updateContent(req.params.id, validated);
      res.json(content);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  app.delete("/api/content/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Episode routes
  app.get("/api/episodes/:seriesId", async (req, res) => {
    try {
      const episodes = await storage.getEpisodesBySeriesId(req.params.seriesId);
      res.json(episodes);
    } catch (error) {
      console.error("Error fetching episodes:", error);
      res.status(500).json({ message: "Failed to fetch episodes" });
    }
  });

  // Watchlist routes
  app.get("/api/watchlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const watchlist = await storage.getWatchlistByUserId(userId);
      res.json(watchlist);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.get("/api/watchlist/check/:contentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isInList = await storage.isInWatchlist(userId, req.params.contentId);
      res.json(isInList);
    } catch (error) {
      console.error("Error checking watchlist:", error);
      res.status(500).json({ message: "Failed to check watchlist" });
    }
  });

  app.post("/api/watchlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertWatchlistSchema.parse({
        ...req.body,
        userId,
      });
      const watchlistItem = await storage.addToWatchlist(validated);
      res.json(watchlistItem);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(400).json({ message: "Invalid watchlist data" });
    }
  });

  app.delete("/api/watchlist/:contentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromWatchlist(userId, req.params.contentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // Continue watching routes
  app.get("/api/continue-watching", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const continueWatching = await storage.getViewingProgressByUserId(userId);
      res.json(continueWatching);
    } catch (error) {
      console.error("Error fetching continue watching:", error);
      res.status(500).json({ message: "Failed to fetch continue watching" });
    }
  });

  app.post("/api/viewing-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertViewingProgressSchema.parse({
        ...req.body,
        userId,
      });
      const progress = await storage.updateViewingProgress(validated);
      res.json(progress);
    } catch (error) {
      console.error("Error updating viewing progress:", error);
      res.status(400).json({ message: "Invalid progress data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
