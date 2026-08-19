import { NextResponse } from "next/server";
import { SAAS_COOKIE } from "@/lib/tenant";
import { PLATFORM_COOKIE } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SAAS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(PLATFORM_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
