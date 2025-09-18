import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { auth } from "@/lib/auth-server";

export const authRouter = router({
  getUser: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      image: ctx.user.image,
      emailVerified: ctx.user.emailVerified,
    };
  }),

  getSession: publicProcedure.query(({ ctx }) => {
    return {
      session: ctx.session,
      user: ctx.user,
    };
  }),

  forgetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        redirectTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.forgetPassword({
          body: {
            email: input.email.toLowerCase().trim(),
            redirectTo: input.redirectTo || `${process.env.BETTER_AUTH_URL}/reset-password`,
          },
        });

        return {
          success: true,
          message: "Password reset email sent successfully",
        };
      } catch (error: any) {
        // Parse Better Auth error
        let errorData;
        try {
          errorData = error.message ? JSON.parse(error.message) : error;
        } catch {
          errorData = error;
        }

        throw new Error(JSON.stringify({
          code: errorData.code || "RESET_PASSWORD_FAILED",
          message: errorData.message || "Failed to send password reset email",
        }));
      }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.resetPassword({
          body: {
            token: input.token,
            newPassword: input.newPassword,
          },
        });

        return {
          success: true,
          message: "Password reset successful",
        };
      } catch (error: any) {
        // Parse Better Auth error
        let errorData;
        try {
          errorData = error.message ? JSON.parse(error.message) : error;
        } catch {
          errorData = error;
        }

        throw new Error(JSON.stringify({
          code: errorData.code || "RESET_PASSWORD_FAILED",
          message: errorData.message || "Failed to reset password",
        }));
      }
    }),

  resendVerificationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        callbackURL: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.sendVerificationEmail({
          body: {
            email: input.email.toLowerCase().trim(),
            callbackURL: input.callbackURL || "/verify-email",
          },
        });

        return {
          success: true,
          message: "Verification email sent successfully",
        };
      } catch (error: any) {
        // Parse Better Auth error
        let errorData;
        try {
          errorData = error.message ? JSON.parse(error.message) : error;
        } catch {
          errorData = error;
        }

        throw new Error(JSON.stringify({
          code: errorData.code || "VERIFICATION_EMAIL_FAILED",
          message: errorData.message || "Failed to send verification email",
        }));
      }
    }),

  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.verifyEmail({
          query: {
            token: input.token,
          },
        });

        return {
          success: true,
          message: "Email verified successfully",
        };
      } catch (error: any) {
        // Parse Better Auth error
        let errorData;
        try {
          errorData = error.message ? JSON.parse(error.message) : error;
        } catch {
          errorData = error;
        }

        throw new Error(JSON.stringify({
          code: errorData.code || "VERIFICATION_FAILED",
          message: errorData.message || "Failed to verify email",
        }));
      }
    }),
});