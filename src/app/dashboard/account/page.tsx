"use client";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogOut, Mail, Shield, User, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { sendVerificationEmail } from "@/lib/auth-client";
import { toast } from "sonner";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ModeToggle } from "@/components/ui/theme-icon";
import Image from "next/image";
import logo from '@/assets/Chatbot_Logo_No_circule.png';

export default function AccountPage() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const [resendLoading, setResendLoading] = useState(false);

  const userQuery = trpc.auth.getUser.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleResendVerification = async () => {
    if (!userQuery.data?.email) {
      toast.error("Email not found", {
        description: "Unable to send verification email"
      });
      return;
    }

    setResendLoading(true);
    toast.loading("Sending verification email...", { id: "dashboard-resend" });

    try {
      await sendVerificationEmail({
        email: userQuery.data.email,
        callbackURL: "/verify-email",
      });

      toast.dismiss("dashboard-resend");
      toast.success("Verification email sent!", {
        description: "Check your inbox for the verification link"
      });
    } catch (err: any) {
      toast.dismiss("dashboard-resend");

      try {
        const errorData = err.message ? JSON.parse(err.message) : null;
        const message = errorData?.message || err.message;
        const code = errorData?.code;

        toast.error(message || "Failed to send verification email", {
          description: code || "Please try again later"
        });
      } catch {
        toast.error(err.message || "Failed to send verification email", {
          description: "Please try again later"
        });
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    toast.loading("Signing out...", { id: "signout" });

    try {
      await signOut();
      toast.dismiss("signout");
      toast.success("Signed out successfully", {
        description: "You have been safely signed out"
      });
      router.push("/login");
    } catch (err: any) {
      toast.dismiss("signout");
      toast.error("Failed to sign out", {
        description: "Please try again or refresh the page"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Sidebar */}
      <ChatSidebar
        currentSessionId={null}
        onSessionSelect={() => {}}
        onNewChat={() => {}}
      />

      {/* Main Account Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src={logo}
                alt="DocChat Logo"
                width={34}
                height={34}
                className="rounded"
              />
              <div>
                <h1 className="text-lg font-semibold">Account Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Account Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Welcome back!
                </CardTitle>
                <CardDescription>
                  Here's your account overview and verification status.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Email Verification Alert */}
            {userQuery.data && !userQuery.data.emailVerified && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex items-center justify-between">
                    <span>Please verify your email address to access all features.</span>
                    <Button
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      variant="outline"
                      className="ml-4"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-3 w-3" />
                          Resend Email
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userQuery.data ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Full Name
                          </label>
                          <div className="mt-2 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userQuery.data.name}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Email Address
                          </label>
                          <div className="mt-2 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userQuery.data.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Account Status
                          </label>
                          <div className="mt-2">
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Email Verification
                          </label>
                          <div className="mt-2">
                            {userQuery.data.emailVerified ? (
                              <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {userQuery.data.emailVerified && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Your email is verified! You have full access to all features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
          </div>
        </div>
      </div>
    </div>
  );
}