import NextAuth, { type NextAuthConfig, type Session, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { storage } from "@/lib/server/storage";
import { users, accounts, sessions, verificationTokens } from "@shared/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string | null;
      name: string | null;
      image: string | null;
      role: string;
    };
  }

  interface User {
    role?: string;
  }
}

export const authConfig = {
  // JWT strategy keeps things stateless and Vercel-edge friendly. The Drizzle
  // adapter is still configured for OAuth account linking and verification
  // tokens when we add Google/GitHub providers later.
  session: { strategy: "jwt" },
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users as any,
        accountsTable: accounts as any,
        sessionsTable: sessions as any,
        verificationTokensTable: verificationTokens as any,
      })
    : undefined,
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        if (!db) return null;
        const user = await storage.getUserByEmail(parsed.data.email);
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.firstName ?? null,
          image: user.image ?? user.profileImageUrl ?? null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as User).id;
        token.role = (user as User).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId ?? token.sub) as string;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function requireAuth(): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.user;
}

export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
