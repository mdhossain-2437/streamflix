import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Movies from "@/pages/Movies";
import Series from "@/pages/Series";
import ContentDetail from "@/pages/ContentDetail";
import Watch from "@/pages/Watch";
import Watchlist from "@/pages/Watchlist";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/movies" component={Movies} />
          <Route path="/series" component={Series} />
          <Route path="/movie/:id" component={ContentDetail} />
          <Route path="/series/:id" component={ContentDetail} />
          <Route path="/watch/:id" component={Watch} />
          <Route path="/watchlist" component={Watchlist} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
