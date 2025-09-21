"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, X, Mail } from "lucide-react";
import { authClient, sendVerificationEmail } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";

function VerifyEmailContent() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if we have a token in the URL or if this is just the verification page
    if (token) {
      verifyEmail(token);
    } else {
      // If no token, this might be a redirect after signup
      setLoading(false);
      // Don't set error immediately, let the user see the default state
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    toast.loading("Verifying your email...", { id: "verify-email" });
    
    try {
      await authClient.api.verifyEmail({
        query: { token },
      });
      
      toast.dismiss("verify-email");
      toast.success("Email verified successfully!", {
        description: "Welcome! Your account is now fully activated"
      });
      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      toast.dismiss("verify-email");
      
      try {
        const errorData = err.message ? JSON.parse(err.message) : null;
        const message = errorData?.message || err.message;
        const code = errorData?.code;

        if (err.status === 409 || code === "EMAIL_ALREADY_VERIFIED") {
          toast.success("Already verified!", {
            description: "Your email has already been verified"
          });
          setError("Your email has already been verified");
          // Still redirect to dashboard since they're verified
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          toast.error(message || "Verification failed", {
            description: code || "The verification link may be invalid or expired"
          });
          setError(message || "Email verification failed");
        }
      } catch {
        // Fallback if parsing fails
        toast.error(err.message || "Verification failed", {
          description: "An unexpected error occurred"
        });
        setError(err.message || "Email verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Email address not found", {
        description: "Please sign up again to receive a verification email"
      });
      return;
    }

    setResendLoading(true);
    toast.loading("Sending verification email...", { id: "resend-verification" });

    try {
      await sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });
      
      toast.dismiss("resend-verification");
      toast.success("Verification email sent!", {
        description: "Check your inbox for the new verification link"
      });
    } catch (err: any) {
      toast.dismiss("resend-verification");
      
      try {
        const errorData = err.message ? JSON.parse(err.message) : null;
        const message = errorData?.message || err.message;
        const code = errorData?.code;

        toast.error(message || "Failed to send verification email", {
          description: code || "An unexpected error occurred"
        });
      } catch {
        // Fallback if parsing fails
        toast.error(err.message || "Failed to send verification email", {
          description: "Please try again later"
        });
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <CardTitle className="text-xl">Verifying Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now access all features of your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <X className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            {email && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  The verification link may have expired. You can request a new one.
                </p>
                <Button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default state - no token provided
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a verification email. Click the link in the email to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              If you don't see the email, check your spam folder or try requesting a new verification email.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <CardTitle className="text-xl">Loading</CardTitle>
          <CardDescription>
            Please wait...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}