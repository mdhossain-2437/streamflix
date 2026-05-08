"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data, status } = useSession();
  const user = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.name?.split(" ")[0] ?? null,
        lastName: data.user.name?.split(" ").slice(1).join(" ") || null,
        profileImageUrl: data.user.image ?? null,
        role: data.user.role,
      }
    : undefined;

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
