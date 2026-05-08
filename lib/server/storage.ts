import {
  users,
  content,
  episodes,
  watchlist,
  viewingProgress,
  type User,
  type UpsertUser,
  type Content,
  type InsertContent,
  type Episode,
  type InsertEpisode,
  type Watchlist,
  type InsertWatchlist,
  type ViewingProgress,
  type InsertViewingProgress,
} from "@shared/schema";
import { db } from "@/lib/server/db";
import { eq, and, desc, ilike, or, sql, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getContent(id: string): Promise<Content | undefined>;
  getAllContent(params: {
    type?: string;
    genres?: string[];
    sort?: string;
    limit?: number;
  }): Promise<Content[]>;
  getFeaturedContent(): Promise<Content | undefined>;
  getTrendingContent(limit?: number): Promise<Content[]>;
  getSimilarContent(contentId: string, limit?: number): Promise<Content[]>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, content: Partial<InsertContent>): Promise<Content>;
  deleteContent(id: string): Promise<void>;

  getEpisodesBySeriesId(seriesId: string): Promise<Episode[]>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;

  getWatchlistByUserId(userId: string): Promise<Content[]>;
  isInWatchlist(userId: string, contentId: string): Promise<boolean>;
  addToWatchlist(data: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(userId: string, contentId: string): Promise<void>;

  getViewingProgressByUserId(
    userId: string,
  ): Promise<Array<{ content: Content; progress: ViewingProgress }>>;
  updateViewingProgress(data: InsertViewingProgress): Promise<ViewingProgress>;
}

class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Content operations
  async getContent(id: string): Promise<Content | undefined> {
    const [item] = await db.select().from(content).where(eq(content.id, id));
    return item;
  }

  async getAllContent(params: {
    type?: string;
    genres?: string[];
    sort?: string;
    limit?: number;
  }): Promise<Content[]> {
    const conditions = [] as any[];
    if (params.type) {
      conditions.push(eq(content.type, params.type));
    }

    let orderClause: any = desc(content.createdAt);
    switch (params.sort) {
      case "title":
        orderClause = asc(content.title);
        break;
      case "rating":
        orderClause = desc(content.imdbRating);
        break;
      case "recent":
        orderClause = desc(content.releaseYear);
        break;
      default:
        break;
    }

    const items = await (
      conditions.length > 0
        ? db.select().from(content).where(and(...conditions))
        : db.select().from(content)
    )
      .orderBy(orderClause)
      .limit(params.limit || 50);

    if (params.genres && params.genres.length > 0) {
      return items.filter((item) =>
        item.genres?.some((g) => params.genres!.includes(g)),
      );
    }
    return items;
  }

  async getFeaturedContent(): Promise<Content | undefined> {
    const [item] = await db
      .select()
      .from(content)
      .where(eq(content.featured, true))
      .limit(1);
    return item;
  }

  async getTrendingContent(limit = 20): Promise<Content[]> {
    const items = await db
      .select()
      .from(content)
      .where(eq(content.trending, true))
      .limit(limit);
    return items;
  }

  async getSimilarContent(contentId: string, limit = 6): Promise<Content[]> {
    const [originalContent] = await db
      .select()
      .from(content)
      .where(eq(content.id, contentId));

    if (!originalContent) return [];

    const items = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.type, originalContent.type),
          or(
            ...((originalContent.genres || []).map((genre) =>
              ilike(sql`array_to_string(${content.genres}, ',')`, `%${genre}%`),
            )),
          ),
        ),
      )
      .limit(limit + 1);

    return items.filter((item) => item.id !== contentId).slice(0, limit);
  }

  async createContent(contentData: InsertContent): Promise<Content> {
    const [item] = await db.insert(content).values(contentData as any).returning();
    return item;
  }

  async updateContent(id: string, contentData: Partial<InsertContent>): Promise<Content> {
    const [updated] = await db
      .update(content)
      .set(contentData as any)
      .where(eq(content.id, id))
      .returning();
    return updated;
  }

  async deleteContent(id: string): Promise<void> {
    await db.delete(content).where(eq(content.id, id));
  }

  // Episode operations
  async getEpisodesBySeriesId(seriesId: string): Promise<Episode[]> {
    const items = await db
      .select()
      .from(episodes)
      .where(eq(episodes.seriesId, seriesId))
      .orderBy(episodes.seasonNumber, episodes.episodeNumber);
    return items;
  }

  async createEpisode(episodeData: InsertEpisode): Promise<Episode> {
    const [episode] = await db.insert(episodes).values(episodeData as any).returning();
    return episode;
  }

  // Watchlist operations
  async getWatchlistByUserId(userId: string): Promise<Content[]> {
    const items = await db
      .select({ content })
      .from(watchlist)
      .innerJoin(content, eq(watchlist.contentId, content.id))
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.addedAt));

    return items.map((item) => item.content);
  }

  async isInWatchlist(userId: string, contentId: string): Promise<boolean> {
    const [item] = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.contentId, contentId)));
    return !!item;
  }

  async addToWatchlist(data: InsertWatchlist): Promise<Watchlist> {
    const [item] = await db.insert(watchlist).values(data).returning();
    return item;
  }

  async removeFromWatchlist(userId: string, contentId: string): Promise<void> {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.contentId, contentId)));
  }

  // Viewing progress operations
  async getViewingProgressByUserId(
    userId: string,
  ): Promise<Array<{ content: Content; progress: ViewingProgress }>> {
    const items = await db
      .select({ content, progress: viewingProgress })
      .from(viewingProgress)
      .innerJoin(content, eq(viewingProgress.contentId, content.id))
      .where(and(eq(viewingProgress.userId, userId), eq(viewingProgress.completed, false)))
      .orderBy(desc(viewingProgress.lastWatchedAt))
      .limit(20);

    return items.map((item) => ({
      content: item.content,
      progress: item.progress,
    }));
  }

  async updateViewingProgress(data: InsertViewingProgress): Promise<ViewingProgress> {
    const existing = await db
      .select()
      .from(viewingProgress)
      .where(
        and(
          eq(viewingProgress.userId, data.userId),
          eq(viewingProgress.contentId, data.contentId),
          data.episodeId
            ? eq(viewingProgress.episodeId, data.episodeId)
            : sql`${viewingProgress.episodeId} IS NULL`,
        ),
      );

    const progressSeconds = data.progressSeconds ?? 0;
    const durationSeconds = data.durationSeconds ?? 0;
    const completed = progressSeconds >= durationSeconds * 0.9;

    if (existing.length > 0) {
      const [updated] = await db
        .update(viewingProgress)
        .set({
          progressSeconds,
          durationSeconds,
          completed,
          lastWatchedAt: new Date(),
        })
        .where(eq(viewingProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(viewingProgress)
        .values({ ...data, completed })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
