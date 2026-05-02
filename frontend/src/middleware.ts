/**
 * Next.js Middleware — runs on the Edge before every matched request.
 * Protects /profile, /orders, /addresses, /wishlist, and /admin/* routes.
 * Redirects to /auth/login if no access token is found in cookies.
 *
 * NOTE: In Phase 2, auth tokens will be stored in httpOnly cookies for
 * proper SSR-compatible protection. For now, the middleware checks for a
 * client-side token cookie (set by the auth store after login).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CUSTOMER_ROUTES = ["/profile", "/addresses", "/orders", "/wishlist"];
const ADMIN_ROUTES    = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCustomerRoute = CUSTOMER_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute    = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if (!isCustomerRoute && !isAdminRoute) return NextResponse.next();

  // Phase 1: check for auth cookie (set in Phase 2 with httpOnly)
  // For now, allow through — the client stores handle redirects
  const token = request.cookies.get("sf-auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/addresses/:path*",
    "/orders/:path*",
    "/wishlist/:path*",
    "/admin/:path*",
  ],
};
