// import { createTRPCMsw } from "@trpc/msw";
import { appRouter, type AppRouter } from "@/server";
import { createContext } from "@/server/context";

// export const trpcMsw = createTRPCMsw<AppRouter>();

export async function createCaller() {
  return appRouter.createCaller(await createContext());
}
