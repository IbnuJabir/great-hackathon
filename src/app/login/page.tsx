"use client";

import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to your account</h2>
          <p className="mt-2 text-gray-600">
            Or{" "}
            <Link href="/signup" className="text-blue-500 hover:text-blue-600">
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
