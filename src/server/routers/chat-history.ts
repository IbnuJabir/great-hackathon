import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@/lib/prisma";

const createSessionSchema = z.object({
  title: z.string().optional(),
});

const updateSessionSchema = z.object({
  sessionId: z.string().cuid(),
  title: z.string().min(1).max(100),
});

const deleteSessionSchema = z.object({
  sessionId: z.string().cuid(),
});

const getSessionSchema = z.object({
  sessionId: z.string().cuid(),
});

const saveMessageSchema = z.object({
  sessionId: z.string().cuid(),
  role: z.enum(["USER", "ASSISTANT"]),
  content: z.string().min(1),
  sources: z.any().optional(),
});

export const chatHistoryRouter = router({
  // Create new chat session
  createSession: protectedProcedure
    .input(createSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.chatSession.create({
        data: {
          title: input.title || "New Chat",
          userId: ctx.user.id,
        },
      });

      return session;
    }),

  // List all user's chat sessions
  listSessions: protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await prisma.chatSession.findMany({
        where: { userId: ctx.user.id },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return sessions.map(session => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session._count.messages,
        lastMessage: session.messages[0]?.content,
        lastMessageAt: session.messages[0]?.createdAt,
      }));
    }),

  // Get specific session with all messages
  getSession: protectedProcedure
    .input(getSessionSchema)
    .query(async ({ input, ctx }) => {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages.map(message => ({
          id: message.id,
          type: message.role.toLowerCase() as "user" | "assistant",
          content: message.content,
          sources: message.sources,
          timestamp: message.createdAt,
        })),
      };
    }),

  // Save message to session
  saveMessage: protectedProcedure
    .input(saveMessageSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify session belongs to user
      const session = await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          sources: input.sources,
        },
      });

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { updatedAt: new Date() },
      });

      // Auto-generate title from first user message
      if (input.role === "USER" && session.title === "New Chat") {
        const title = input.content.length > 50
          ? input.content.substring(0, 50) + "..."
          : input.content;

        await prisma.chatSession.update({
          where: { id: input.sessionId },
          data: { title },
        });
      }

      return {
        id: message.id,
        type: message.role.toLowerCase() as "user" | "assistant",
        content: message.content,
        sources: message.sources,
        timestamp: message.createdAt,
      };
    }),

  // Update session title
  updateSession: protectedProcedure
    .input(updateSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      const updatedSession = await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { title: input.title },
      });

      return updatedSession;
    }),

  // Delete session
  deleteSession: protectedProcedure
    .input(deleteSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      await prisma.chatSession.delete({
        where: { id: input.sessionId },
      });

      return { success: true };
    }),
});