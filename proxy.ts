import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Middleware:
 * - API routes (except /api/auth/*) return 401 if the user is not authenticated.
 * - The main page always passes through; auth is checked in the page component
 *   itself, which renders a login screen if the session is missing.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Never block NextAuth's own routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Protect all other API routes
  if (pathname.startsWith("/api/") && !req.auth) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar.", authenticated: false },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*"],
};
