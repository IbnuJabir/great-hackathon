"use client";

import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-muted-foreground">
            Or{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80">
              create a new account
            </Link>
          </p>
        </div>

        <div className="space-y-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
