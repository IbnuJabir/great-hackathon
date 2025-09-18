"use client";

import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
  });

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    isLoading,
    error,
    isAuthenticated: !!session?.user,
    signOut,
  };
}