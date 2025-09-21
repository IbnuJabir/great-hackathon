import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendEmail, emailTemplates } from "./email";
import { prisma } from "./prisma";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-here-min-32-chars-long-replace-with-actual-secret",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      const template = emailTemplates.passwordReset({
        name: user.name,
        resetUrl: url,
      });
      
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Create custom verification URL that points to our page instead of API endpoint
      const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
      const verificationUrl = `${baseURL}/verify-email?token=${token}`;
      
      const template = emailTemplates.emailVerification({
        name: user.name,
        verificationUrl: verificationUrl,
      });
      
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [nextCookies()],
});