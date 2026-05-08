import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  index,
  jsonb,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { AdapterAccount } from "next-auth/adapters";

// User storage table (NextAuth.js compatible + role for admin gating)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name"),
  email: varchar("email").unique(),
  emailVerified: timestamp("email_verified"),
  image: varchar("image"),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  // Legacy / compatibility fields (Replit Auth era)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NextAuth.js account table (for OAuth providers)
export const accounts = pgTable(
  "accounts",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type").notNull().$type<AdapterAccount["type"]>(),
    provider: varchar("provider").notNull(),
    providerAccountId: varchar("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type"),
    scope: varchar("scope"),
    id_token: text("id_token"),
    session_state: varchar("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

// NextAuth.js session table
export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// NextAuth.js verification token table (magic-link / email)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier").notNull(),
    token: varchar("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// Content table (movies and series)
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // "movie" or "series"
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  backdropUrl: text("backdrop_url"),
  trailerUrl: text("trailer_url"),
  videoUrl: text("video_url"),
  duration: integer("duration"), // in minutes (for movies)
  releaseYear: integer("release_year"),
  rating: text("rating"), // "PG", "PG-13", "R", etc.
  imdbRating: text("imdb_rating"), // e.g., "8.5"
  genres: text("genres").array(),
  cast: jsonb("cast").$type<{ name: string; role: string; imageUrl: string }[]>(),
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  // Legitimacy / source tracking — every row must declare where it came from
  source: varchar("source", { length: 24 }).default("manual"),
  // "manual" | "internet_archive" | "creative_commons" | "tmdb" | "user_upload"
  sourceId: varchar("source_id", { length: 128 }),
  license: varchar("license", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Episodes table (for series)
export const episodes = pgTable("episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesId: varchar("series_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Watchlist table
export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
});

// Viewing progress table
export const viewingProgress = pgTable("viewing_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  episodeId: varchar("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
  progressSeconds: integer("progress_seconds").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull(),
  completed: boolean("completed").default(false),
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
});

// Relations
export const contentRelations = relations(content, ({ many }) => ({
  episodes: many(episodes),
  watchlistEntries: many(watchlist),
  viewingProgress: many(viewingProgress),
}));

export const episodesRelations = relations(episodes, ({ one }) => ({
  series: one(content, {
    fields: [episodes.seriesId],
    references: [content.id],
  }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [watchlist.contentId],
    references: [content.id],
  }),
}));

export const viewingProgressRelations = relations(viewingProgress, ({ one }) => ({
  user: one(users, {
    fields: [viewingProgress.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [viewingProgress.contentId],
    references: [content.id],
  }),
  episode: one(episodes, {
    fields: [viewingProgress.episodeId],
    references: [episodes.id],
  }),
}));

// Insert schemas
export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
});

export const insertEpisodeSchema = createInsertSchema(episodes).omit({
  id: true,
  createdAt: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  addedAt: true,
});

export const insertViewingProgressSchema = createInsertSchema(viewingProgress).omit({
  id: true,
  lastWatchedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type ViewingProgress = typeof viewingProgress.$inferSelect;
export type InsertViewingProgress = z.infer<typeof insertViewingProgressSchema>;
