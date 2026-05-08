"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/home";

  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Could not create account");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid email or password");
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-900/30 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_-10%,rgba(229,9,20,0.35),transparent_60%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 md:px-10 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl tracking-[0.04em]"
            data-testid="link-home-signin"
          >
            STREAM<span className="text-primary">FLIX</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </header>

        <div className="flex-1 grid place-items-center px-4">
          <div
            className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl p-8 md:p-10 shadow-cinematic"
            data-testid="signin-card"
          >
            <div className="text-center mb-8 space-y-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                {mode === "sign-in" ? "Welcome back" : "Create account"}
              </span>
              <h1 className="font-display text-3xl md:text-4xl">
                {mode === "sign-in" ? "Sign in to continue" : "Join StreamFlix"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "sign-in"
                  ? "Pick up where you left off."
                  : "Two minutes. No upsells."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-white/[0.04] border-white/10"
                    data-testid="input-name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white/[0.04] border-white/10"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/[0.04] border-white/10"
                  data-testid="input-password"
                />
              </div>

              {error && (
                <p
                  className="text-sm text-rose-400 text-center"
                  data-testid="text-signin-error"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-[0.18em] text-xs shadow-glow group"
                data-testid="button-signin-submit"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "sign-in" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/[0.06] text-center text-sm text-muted-foreground">
              {mode === "sign-in" ? (
                <>
                  No account yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError(null);
                    }}
                    className="text-primary hover:underline font-semibold"
                    data-testid="button-toggle-register"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already a member?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("sign-in");
                      setError(null);
                    }}
                    className="text-primary hover:underline font-semibold"
                    data-testid="button-toggle-signin"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="px-6 md:px-10 py-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our terms · Cancel anytime
        </footer>
      </div>
    </main>
  );
}
