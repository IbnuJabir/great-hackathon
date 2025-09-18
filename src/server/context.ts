import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

export async function createContext() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return {
      session,
      user: session?.user ?? null,
    };
  } catch (error) {
    // Fallback for Edge Runtime or other environments
    console.warn("Could not get session in context:", error);
    return {
      session: null,
      user: null,
    };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;