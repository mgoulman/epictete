import { redirect } from "next/navigation";
import { getSessionView } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountForm } from "./AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSessionView();
  if (!session) redirect("/login");
  return (
    <>
      <PageHeader title="Mon compte" subtitle="Vos informations personnelles et votre mot de passe." />
      <AccountForm name={session.user.name} email={session.user.email} />
    </>
  );
}
