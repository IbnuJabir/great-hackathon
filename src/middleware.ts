import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard"];
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
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};