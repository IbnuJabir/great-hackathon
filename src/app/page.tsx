"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ui/theme-icon";
import { useAuth } from "@/hooks/use-auth";
import logo from '@/assets/Chatbot_Logo_No_circule.png';
import { FileText, MessageSquare, Zap, Shield, Clock, CheckCircle, ArrowRight, Upload, Brain, VerifiedIcon } from "lucide-react";

export default function Home() {
  const { isAuthenticated, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Image
                src={logo}
                alt="DocChat Logo"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="text-xl font-bold">DocChat</span>
            </div>

            <div className="flex items-center gap-4">
              <ModeToggle />
              {!isAuthenticated ? (
                <div className="flex gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" onClick={signOut}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            AI-Powered Document Search
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Stop Hunting Through
            <span className="text-primary"> Manuals</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your technical documents and get instant, trustworthy answers with source citations.
            Built for manufacturing teams who need information fast.
          </p>

          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            {!isAuthenticated ? (
              <>
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            ) : (
              <Button size="lg" asChild>
                <Link href="/dashboard/chat">
                  Start Chatting
                  <MessageSquare className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl"></div>
              <Card className="relative bg-background/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>No setup required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Source citations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Secure & private</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">The Problem</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  Manufacturing technicians waste <strong className="text-foreground">hours every day</strong>
                  hunting through massive technical manuals to find the right information.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    <span>Time lost searching through hundreds of pages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    <span>Difficulty finding relevant sections quickly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    <span>Uncertainty about information accuracy</span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">The Solution</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  <strong className="text-foreground">DocChat</strong> provides instant,
                  conversational access to your technical documentation with trustworthy source citations.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Ask questions in natural language</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Get answers with source citations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Verify information with direct links</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to make your technical documentation instantly searchable
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Upload className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Easy Document Upload</CardTitle>
                <CardDescription>
                  Drag and drop PDFs, text files, and scanned documents. We handle the rest.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-8 w-8 text-primary mb-2" />
                <CardTitle>AI-Powered Search</CardTitle>
                <CardDescription>
                  Ask questions in natural language and get precise answers using advanced semantic search.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <VerifiedIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Source Citations</CardTitle>
                <CardDescription>
                  Every answer includes source snippets and direct links so you can verify and trust the information.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Multiple Formats</CardTitle>
                <CardDescription>
                  Support for text PDFs, scanned documents with OCR, and plain text files.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Get answers in seconds, not hours. Our vector search technology finds relevant information instantly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your documents are encrypted and secure. User-scoped access ensures data privacy.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join manufacturing teams who have already reduced manual search time by 90%.
          </p>

          {!isAuthenticated ? (
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src={logo}
                  alt="DocChat Logo"
                  width={24}
                  height={24}
                  className="rounded"
                />
                <span className="text-lg font-bold">DocChat</span>
              </div>
              <p className="text-muted-foreground mb-4">
                AI-powered document search for manufacturing teams. Get instant answers from your technical manuals.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Built with</span>
                <Badge variant="outline">Next.js</Badge>
                <Badge variant="outline">AWS Bedrock</Badge>
                <Badge variant="outline">PostgreSQL</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/documents" className="hover:text-foreground transition-colors">
                    Documents
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/chat" className="hover:text-foreground transition-colors">
                    Chat
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {!isAuthenticated ? (
                  <>
                    <li>
                      <Link href="/login" className="hover:text-foreground transition-colors">
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link href="/signup" className="hover:text-foreground transition-colors">
                        Sign Up
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/dashboard/account" className="hover:text-foreground transition-colors">
                        Account Settings
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={signOut}
                        className="hover:text-foreground transition-colors text-left"
                      >
                        Sign Out
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 DocChat. Built for manufacturing excellence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
