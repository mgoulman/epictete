import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MENU_HOST = "menu.epictetelerestaurant.ma";
const PREVIEW_HOST_PATTERN = /^menu-[a-z0-9-]+\.vercel\.app$/;
// testing 
export default function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();

  if (!host) {
    return NextResponse.next();
  }

  if (host === MENU_HOST || PREVIEW_HOST_PATTERN.test(host)) {
    return NextResponse.rewrite(new URL("/menu", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
