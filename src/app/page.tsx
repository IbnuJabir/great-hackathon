"use client";

import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const healthQuery = trpc.health.useQuery();
  const { user, isAuthenticated, signOut } = useAuth();
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="font-mono text-sm/6 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">🚀 Full Stack Setup Complete!</h3>
            <div className="space-y-2">
              <div>
                <span className="text-green-600 dark:text-green-400">Health Check: </span>
                {healthQuery.isLoading ? (
                  <span className="text-gray-500">Loading...</span>
                ) : healthQuery.error ? (
                  <span className="text-red-500">Error: {healthQuery.error.message}</span>
                ) : (
                  <span className="text-green-700 dark:text-green-300">
                    {healthQuery.data?.status} - {healthQuery.data?.message}
                  </span>
                )}
              </div>
              <div>
                <span className="text-green-600 dark:text-green-400">Auth Status: </span>
                <span className="text-green-700 dark:text-green-300">
                  {isAuthenticated ? `Logged in as ${user?.name}` : "Not authenticated"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {!isAuthenticated ? (
              <div className="flex gap-4 justify-center sm:justify-start">
                <Link
                  href="/login"
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex gap-4 justify-center sm:justify-start">
                <Link
                  href="/dashboard"
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <ol className="list-inside list-decimal text-center sm:text-left">
            <li className="mb-2 tracking-[-.01em]">
              ✅ tRPC + Next.js + TypeScript
            </li>
            <li className="mb-2 tracking-[-.01em]">
              ✅ Better Auth + PostgreSQL + Prisma
            </li>
            <li className="tracking-[-.01em]">
              ✅ Email/Password + Google OAuth ready
            </li>
          </ol>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
