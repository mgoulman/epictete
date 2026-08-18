import { NextResponse } from "next/server";
import { SAAS_COOKIE } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SAAS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
