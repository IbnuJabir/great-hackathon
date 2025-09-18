import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { authRouter } from "./auth";

export const appRouter = router({
  auth: authRouter,
  
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "Server is healthy",
    };
  }),

  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name || "World"}!`,
        timestamp: new Date().toISOString(),
      };
    }),
});

export type AppRouter = typeof appRouter;