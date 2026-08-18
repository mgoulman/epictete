import { redirect } from "next/navigation";
import { getSessionView } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionView();
  redirect(session ? "/dashboard" : "/login");
}
