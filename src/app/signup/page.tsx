"use client";

import { SignupForm } from "@/components/auth/signup-form";
import { SocialLogin } from "@/components/auth/social-login";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-600">
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
