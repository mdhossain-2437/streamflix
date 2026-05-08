"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { LogOut, Sparkles, Crown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 grid place-items-center">
          <div className="font-display text-4xl text-primary animate-glow-pulse">
            STREAM<span className="text-foreground">FLIX</span>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Member";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="overflow-hidden border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-md">
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/15 via-rose-700/10 to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                  <Avatar className="w-28 h-28 ring-4 ring-primary/30 shadow-glow">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-rose-700 text-primary-foreground text-3xl font-bold">
                      {user?.firstName?.[0] ||
                        user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      <Crown className="w-3 h-3" /> Premium · 4K HDR
                    </span>
                    <CardTitle
                      className="font-display text-4xl md:text-5xl tracking-[0.005em]"
                      data-testid="text-user-name"
                    >
                      {displayName}
                    </CardTitle>
                    <CardDescription
                      className="text-sm md:text-base"
                      data-testid="text-user-email"
                    >
                      {user?.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/[0.04] border border-white/[0.06] p-1">
              <TabsTrigger
                value="account"
                data-testid="tab-account"
                className="data-[state=active]:bg-white/10"
              >
                Account
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                data-testid="tab-preferences"
                className="data-[state=active]:bg-white/10"
              >
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4 mt-6">
              <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                  <CardDescription>
                    Your StreamFlix account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Email
                      </label>
                      <p
                        className="text-sm text-foreground"
                        data-testid="text-account-email"
                      >
                        {user?.email || "Not provided"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Member Since
                      </label>
                      <p
                        className="text-sm text-foreground"
                        data-testid="text-member-since"
                      >
                        {"Member"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4 mt-6">
              <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Viewing Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your streaming experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Default Video Quality", value: "Auto (recommended)" },
                    { label: "Autoplay Next Episode", value: "Enabled" },
                    { label: "Subtitle Language", value: "English" },
                    { label: "Audio Language", value: "Original" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                    >
                      <span className="text-sm font-medium">{row.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {row.value}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    More preference controls coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}
