"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Mail, Key, CheckCircle } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (name.length < 2) {
      toast.error("Name must be at least 2 characters long");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long", {
        description: "Use a combination of letters, numbers, and symbols"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both password fields are identical"
      });
      return;
    }

    setLoading(true);
    toast.loading("Creating your account...", { id: "signup" });

    try {
      await signUp.email(
        {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          callbackURL: "/verify-email",
        },
        {
          onError: (ctx) => {
            toast.dismiss("signup");
            
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

            toast.error(message || "Registration failed", {
              description: code || "Please check your information and try again"
            });
          },
          onSuccess: () => {
            toast.dismiss("signup");
            toast.success("Account created successfully!", {
              description: "Please check your email to verify your account"
            });
            setSuccess(true);
          },
        }
      );
    } catch (err: any) {
      toast.dismiss("signup");
      toast.error("Network error", {
        description: err.message || "Please check your internet connection"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification email to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Click the link in the email to verify your account and complete your registration.
            </AlertDescription>
          </Alert>
          
          <div className="text-center text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or{" "}
            <button 
              onClick={() => setSuccess(false)}
              className="underline hover:text-foreground"
            >
              try again
            </button>
          </div>

          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Create Account</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className="pl-10"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="pl-10"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !name || !email || !password || !confirmPassword}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              After creating your account, you'll receive a verification email. Please verify your email to complete registration.
            </AlertDescription>
          </Alert>
        </form>

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}