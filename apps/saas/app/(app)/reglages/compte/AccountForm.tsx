"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(name);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const pwTooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canChangePw = current.length > 0 && next.length >= 8 && confirm === next;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await fetchJson("/api/account", { method: "PATCH", json: { name: displayName } });
      toast.success("Profil mis à jour");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canChangePw) return;
    setSavingPw(true);
    try {
      await fetchJson("/api/account", { method: "PATCH", json: { current_password: current, new_password: next } });
      toast.success("Mot de passe modifié");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardBody className="pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)] mb-4">
            <User className="h-4 w-4 text-[var(--color-accent)]" /> Profil
          </div>
          <form onSubmit={saveName} className="space-y-4">
            <FormField label="Nom complet" htmlFor="a-name" required>
              <TextInput id="a-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </FormField>
            <FormField label="Email" htmlFor="a-email" hint="L’email de connexion ne peut pas être modifié pour l’instant.">
              <TextInput id="a-email" value={email} disabled readOnly />
            </FormField>
            <Button type="submit" disabled={savingName || displayName.trim() === name}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Enregistrer
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)] mb-4">
            <Lock className="h-4 w-4 text-[var(--color-accent)]" /> Mot de passe
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <FormField label="Mot de passe actuel" htmlFor="a-cur" required>
              <TextInput id="a-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </FormField>
            <FormField label="Nouveau mot de passe" htmlFor="a-new" required error={pwTooShort ? "8 caractères minimum." : undefined} hint={!pwTooShort ? "8 caractères minimum." : undefined}>
              <TextInput id="a-new" type="password" autoComplete="new-password" invalid={pwTooShort} value={next} onChange={(e) => setNext(e.target.value)} />
            </FormField>
            <FormField label="Confirmez le nouveau mot de passe" htmlFor="a-conf" required error={mismatch ? "Les mots de passe ne correspondent pas." : undefined}>
              <TextInput id="a-conf" type="password" autoComplete="new-password" invalid={mismatch} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </FormField>
            <Button type="submit" disabled={savingPw || !canChangePw}>
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Changer le mot de passe
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
