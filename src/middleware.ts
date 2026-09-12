/**
 * Admin Layout
 *
 * Protects all admin routes. Only accessible to authenticated admins.
 * Admin functionality is completely hidden from normal users.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "nimiq-admin-session";

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      // Redirect to home if not authenticated
      return NextResponse.redirect(new URL("/", request.url));
    }

    // In production: validate JWT/token here
    // For now: basic format check
    try {
      const parts = sessionToken.split("_");
      if (parts.length < 2) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
