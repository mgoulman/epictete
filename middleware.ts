import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MENU_HOST = "menu.epictetelerestaurant.ma";
const PREVIEW_HOST_PATTERN = /^menu-[a-z0-9-]+\.vercel\.app$/;
const STATIC_ASSET_REGEX =
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|pdf|woff2?|ttf)$/i;

// Routes that require authentication
const PROTECTED_ROUTES = ["/admin"];

// Routes that should redirect to admin if already authenticated
const AUTH_ROUTES = ["/login"];

export default async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const pathname = request.nextUrl.pathname;

  // Skip static assets
  if (STATIC_ASSET_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  if (!host) {
    return NextResponse.next();
  }

  // Handle menu subdomain routing
  if (host === MENU_HOST || PREVIEW_HOST_PATTERN.test(host)) {
    return NextResponse.rewrite(new URL("/menu", request.url));
  }

  // Create response that can be modified
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to admin if accessing auth routes while already logged in
  if (isAuthRoute && user) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") || "/admin";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
