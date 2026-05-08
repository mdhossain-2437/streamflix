import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SmoothScrollProvider } from "@/lib/smoothScroll";
import { Cursor } from "@/components/Cursor";
import { RouteFallback } from "@/components/RouteFallback";

// Code-split every route so the initial bundle stays lean.
const Landing = lazy(() => import("@/pages/Landing"));
const Home = lazy(() => import("@/pages/Home"));
const Movies = lazy(() => import("@/pages/Movies"));
const Series = lazy(() => import("@/pages/Series"));
const ContentDetail = lazy(() => import("@/pages/ContentDetail"));
const Watch = lazy(() => import("@/pages/Watch"));
const Search = lazy(() => import("@/pages/Search"));
const Watchlist = lazy(() => import("@/pages/Watchlist"));
const Profile = lazy(() => import("@/pages/Profile"));
const Person = lazy(() => import("@/pages/Person"));
const Free = lazy(() => import("@/pages/Free"));
const FreeRow = lazy(() => import("@/pages/FreeRow"));
const Library = lazy(() => import("@/pages/Library"));
const Collections = lazy(() => import("@/pages/Collections"));
const NotFound = lazy(() => import("@/pages/not-found"));

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
          <Route path="/search" component={Search} />
          <Route path="/movie/:id" component={ContentDetail} />
          <Route path="/series/:id" component={ContentDetail} />
          <Route path="/watch/:id" component={Watch} />
          <Route path="/watchlist" component={Watchlist} />
          <Route path="/profile" component={Profile} />
          <Route path="/person/:id" component={Person} />
          <Route path="/free" component={Free} />
          <Route path="/free/row/:id" component={FreeRow} />
          <Route path="/free/:id" component={Watch} />
          <Route path="/library" component={Library} />
          <Route path="/library/watch/:id" component={Watch} />
          <Route path="/collections" component={Collections} />
          <Route path="/collection/:id" component={Collections} />
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
        <SmoothScrollProvider>
          <Cursor />
          <Toaster />
          <Suspense fallback={<RouteFallback />}>
            <Router />
          </Suspense>
        </SmoothScrollProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
