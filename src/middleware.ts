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

  // Debug: Log all cookies to find the correct session cookie name
  if (process.env.NODE_ENV === "development") {
    console.log("🍪 All cookies:", Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])));
    console.log("📍 Pathname:", pathname);
  }

  // Check for Better Auth session cookie (common naming patterns)
  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("better-auth.session-token") ||
    request.cookies.get("auth.session_token") ||
    request.cookies.get("session_token") ||
    request.cookies.get("better_auth_session") ||
    request.cookies.get("session");

  const isAuthenticated = !!sessionToken?.value;

  if (process.env.NODE_ENV === "development") {
    console.log("🔐 Session token found:", !!sessionToken?.value, "Cookie name:", sessionToken?.name);
    console.log("✅ Is authenticated:", isAuthenticated);
  }

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (process.env.NODE_ENV === "development") {
    console.log("🛡️ Is protected route:", isProtectedRoute);
    console.log("🔑 Is auth route:", isAuthRoute);
  }

  if (isProtectedRoute) {
    if (!isAuthenticated) {
      if (process.env.NODE_ENV === "development") {
        console.log("🚫 Redirecting to login - not authenticated on protected route");
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (isAuthRoute) {
    if (isAuthenticated) {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Redirecting to dashboard - already authenticated on auth route");
      }
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