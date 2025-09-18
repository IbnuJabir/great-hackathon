"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Key, Mail } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    toast.loading("Signing in...", { id: "login" });

    try {
      await signIn.email(
        {
          email,
          password,
          rememberMe,
          callbackURL: "/dashboard",
        },
        {
          onError: (ctx) => {
            toast.dismiss("login");
            
            // Better Auth error structure is different - check ctx.error directly
            let message = ctx.error.message;
            let code = null;
            
            try {
              // Try to parse if message contains JSON
              if (message && message.startsWith('{')) {
                const errorData = JSON.parse(message);
                message = errorData.message || message;
                code = errorData.code;
              }
            } catch {
              // If parsing fails, use the message as-is
            }

            // Show the actual error message from the API
            toast.error(message || "Login failed", {
              description: code || "Please check your credentials and try again"
            });
          },
          onSuccess: () => {
            toast.dismiss("login");
            toast.success("Welcome back!", {
              description: "You have been successfully signed in"
            });
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
          },
        }
      );
    } catch (err: any) {
      toast.dismiss("login");
      toast.error("Connection error", {
        description: err.message || "Please check your internet connection"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    toast.loading("Connecting to Google...", { id: "google-signin" });

    try {
      await signIn.social(
        {
          provider: "google",
          callbackURL: "/dashboard",
        },
        {
          onError: (ctx) => {
            toast.dismiss("google-signin");
            
            let message = ctx.error.message;
            let code = null;
            
            try {
              if (message && message.startsWith('{')) {
                const errorData = JSON.parse(message);
                message = errorData.message || message;
                code = errorData.code;
              }
            } catch {
              // If parsing fails, use the message as-is
            }

            toast.error(message || "Google authentication failed", {
              description: code || "Unable to connect with Google. Please try again."
            });
            setLoading(false);
          },
          onSuccess: () => {
            toast.dismiss("google-signin");
            toast.success("Connected with Google!", {
              description: "Redirecting to your dashboard..."
            });
          },
        }
      );
    } catch (err: any) {
      toast.dismiss("google-signin");
      toast.error("Connection error", {
        description: "Failed to connect to Google services"
      });
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="pl-10"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm underline text-muted-foreground hover:text-foreground"
              >
                Forgot your password?
              </Link>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-10"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="remember" className="text-sm">
              Remember me for 7 days
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="0.98em" height="1em" viewBox="0 0 256 262" className="mr-2">
              <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
              <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
              <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"></path>
              <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
            </svg>
            Sign in with Google
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}