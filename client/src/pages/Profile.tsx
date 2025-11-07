import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
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
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 md:pt-28 px-4 md:px-8 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl" data-testid="text-user-name">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </CardTitle>
                  <CardDescription data-testid="text-user-email">{user?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account" data-testid="tab-account">Account</TabsTrigger>
              <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground" data-testid="text-account-email">
                      {user?.email || "Not provided"}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Member Since</label>
                    <p className="text-sm text-muted-foreground" data-testid="text-member-since">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="pt-4">
                    <Button variant="destructive" asChild data-testid="button-logout">
                      <a href="/api/logout">Sign Out</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Viewing Preferences</CardTitle>
                  <CardDescription>
                    Customize your streaming experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Default Video Quality</label>
                    <p className="text-sm text-muted-foreground">Auto (recommended)</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Autoplay Next Episode</label>
                    <p className="text-sm text-muted-foreground">Enabled</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Subtitle Language</label>
                    <p className="text-sm text-muted-foreground">English</p>
                  </div>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      More preference options coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
