"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { SmoothScrollProvider } from "@/lib/smoothScroll";
import { Cursor } from "@/components/Cursor";
import { Toaster } from "@/components/ui/toaster";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SmoothScrollProvider>
          <Cursor />
          {children}
          <Toaster />
        </SmoothScrollProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
