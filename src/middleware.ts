import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",          // Main dashboard and all sub-routes
  "/dashboard/chat",     // Chat interface
  "/dashboard/documents", // Document management
  "/dashboard/account",  // User account settings
];
// Routes that redirect to dashboard when authenticated
const authRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check for Better Auth session cookie (try different possible cookie names)
  const sessionToken = 
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("auth.session_token") ||
    request.cookies.get("session_token") ||
    request.cookies.get("better-auth.session-token");
    
  const isAuthenticated = !!sessionToken?.value;

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard/chat", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",     // All dashboard routes
    "/login",                // Login page
    "/signup",               // Signup page
  ],
};