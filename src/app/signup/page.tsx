"use client";

import { SignupForm } from "@/components/auth/signup-form";
import { SocialLogin } from "@/components/auth/social-login";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Create your account</h2>
          <p className="mt-2 text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>

        <div className="space-y-6">
          <SignupForm />
          <SocialLogin />
        </div>
      </div>
    </div>
  );
}
