import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ROLE_PERMISSIONS, requiredPermissionForPath } from "@/lib/types/auth";
import type { RoleName } from "@/lib/types/auth";

const MENU_HOST = "menu.epictetelerestaurant.ma";
const PREVIEW_HOST_PATTERN = /^menu-[a-z0-9-]+\.vercel\.app$/;
const STATIC_ASSET_REGEX =
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|pdf|woff2?|ttf)$/i;

const PROTECTED_ROUTES = ["/admin"];
const AUTH_ROUTES = ["/login"];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "epictete-secret-key-change-in-production-2026"
);

export default async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (STATIC_ASSET_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  if (!host) {
    return NextResponse.next();
  }

  if (host === MENU_HOST || PREVIEW_HOST_PATTERN.test(host)) {
    return NextResponse.rewrite(new URL("/menu", request.url));
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Check JWT from cookie — no network call needed
  const token = request.cookies.get("auth_token")?.value;
  let user: { id: string; role?: RoleName } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.sub) {
        user = { id: payload.sub, role: payload.role as RoleName | undefined };
      }
    } catch {
      // Invalid/expired token
    }
  }

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") || "/admin";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Route-level authorization: block access to protected admin pages the
  // user's role lacks the permission for. The dashboard (/admin) and any
  // route not in the map require only authentication. A missing role claim
  // (e.g. a token issued before roles were embedded) grants no permissions,
  // so the user keeps dashboard access and re-login restores the rest.
  if (isProtectedRoute && user && user.role !== "admin") {
    const required = requiredPermissionForPath(pathname);
    if (required) {
      const granted = user.role ? ROLE_PERMISSIONS[user.role] ?? [] : [];
      if (!granted.includes(required)) {
        return NextResponse.redirect(new URL("/admin?denied=1", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
