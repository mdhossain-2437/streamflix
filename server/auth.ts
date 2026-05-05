// Auth shim: prefers Replit Auth when REPL_ID is set (full-stack production),
// otherwise falls back to a cookie-based anonymous guest session that lets the
// app run anywhere — local dev without Replit, plain Node/Express on Vercel,
// containerized deploys, etc. Anonymous sessions persist a stable user ID via
// a long-lived signed cookie so watchlist & history stick to one device.

import type { Express, RequestHandler, Request } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from "crypto";
import { storage } from "./storage";

const SESSION_COOKIE = "streamflix.sid";
const ANON_COOKIE = "streamflix.guest";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function replitConfigured(): boolean {
  return !!(process.env.REPL_ID && process.env.SESSION_SECRET);
}

async function setupReplitAuth(app: Express): Promise<RequestHandler> {
  const mod = await import("./replitAuth");
  await mod.setupAuth(app);
  return mod.isAuthenticated;
}

function setupGuestAuth(app: Express): RequestHandler {
  const Store = MemoryStore(session);
  const sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET_FALLBACK ||
    "streamflix-dev-guest-secret-please-override";

  app.set("trust proxy", 1);
  app.use(
    session({
      name: SESSION_COOKIE,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: true,
      store: new Store({ checkPeriod: 24 * 60 * 60 * 1000 }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_MS,
      },
    }),
  );

  // Ensure every request has a stable guestId. The session middleware populates
  // req.session, and we lazily provision a guest user record so storage methods
  // can write to it without separate sign-in flow.
  app.use(async (req: Request, _res, next) => {
    interface GuestSession {
      guestId?: string;
    }
    const sess = req.session as unknown as session.SessionData & GuestSession;
    if (!sess.guestId) {
      sess.guestId = `guest-${crypto.randomUUID()}`;
      try {
        await storage.upsertUser({
          id: sess.guestId,
          email: null,
          firstName: "Guest",
          lastName: "Viewer",
          profileImageUrl: null,
        });
      } catch (e) {
        // Storage may not be reachable in static deploys; that's OK because
        // the client-side mock owns persistence in those modes.
        console.warn("[auth] guest upsert failed (storage unreachable):", e);
      }
    }
    // Mirror Replit's req.user shape so downstream handlers don't branch.
    (req as unknown as { user: { claims: { sub: string } } }).user = {
      claims: { sub: sess.guestId! },
    };
    (req as unknown as { isAuthenticated: () => boolean }).isAuthenticated = () => true;
    next();
  });

  // Login/logout shims so the existing client-side redirects don't 404 when
  // running without Replit. /api/login becomes a no-op redirect to "/", and
  // /api/logout clears the cookie.
  app.get("/api/login", (_req, res) => res.redirect("/"));
  app.get("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.clearCookie(SESSION_COOKIE);
      res.clearCookie(ANON_COOKIE);
      res.redirect("/");
    });
  });

  // Always-authenticated guard for guest mode.
  return ((req, res, next) => {
    if ((req as unknown as { user?: { claims?: { sub?: string } } }).user?.claims?.sub) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }) satisfies RequestHandler;
}

let isAuthenticatedHandler: RequestHandler = (_req, res) =>
  res.status(503).json({ message: "Auth not initialized" });

export async function setupAuth(app: Express): Promise<void> {
  if (replitConfigured()) {
    try {
      isAuthenticatedHandler = await setupReplitAuth(app);
      console.log("[auth] using Replit Auth");
      return;
    } catch (e) {
      console.warn("[auth] Replit Auth setup failed, falling back to guest:", e);
    }
  }
  isAuthenticatedHandler = setupGuestAuth(app);
  console.log("[auth] using anonymous guest sessions");
}

export const isAuthenticated: RequestHandler = (req, res, next) =>
  isAuthenticatedHandler(req, res, next);
