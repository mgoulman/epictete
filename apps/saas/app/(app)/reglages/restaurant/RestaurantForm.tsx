"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export interface RestaurantProfile {
  name: string;
  slug: string;
  city: string;
  ice: string;
  rc: string;
  billing_email: string;
  branch_name: string;
}

export function RestaurantForm({ initial, canEdit }: { initial: RestaurantProfile; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof RestaurantProfile, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Échec de l’enregistrement.");
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Restaurant"
        subtitle="Profil de l’établissement — utilisé pour la facturation et les documents."
      />

      <form onSubmit={save} className="max-w-2xl space-y-5">
        <Card>
          <CardBody className="pt-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <Store className="h-4 w-4 text-[var(--color-accent)]" /> Établissement
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nom du restaurant</Label>
                <Input id="name" value={form.name} disabled={!canEdit} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="branch">Établissement (branche)</Label>
                <Input id="branch" value={form.branch_name} disabled={!canEdit} onChange={(e) => set("branch_name", e.target.value)} placeholder="ex: Gueliz" />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={form.city} disabled={!canEdit} onChange={(e) => set("city", e.target.value)} placeholder="ex: Marrakech" />
              </div>
              <div>
                <Label htmlFor="currency">Devise</Label>
                <Input id="currency" value="MAD (Dirham)" disabled readOnly />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-5 space-y-4">
            <div className="text-sm font-semibold text-[var(--color-foreground)]">Informations légales &amp; facturation</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ice">ICE</Label>
                <Input id="ice" value={form.ice} disabled={!canEdit} onChange={(e) => set("ice", e.target.value)} placeholder="Identifiant Commun de l’Entreprise" />
              </div>
              <div>
                <Label htmlFor="rc">RC</Label>
                <Input id="rc" value={form.rc} disabled={!canEdit} onChange={(e) => set("rc", e.target.value)} placeholder="Registre de Commerce" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="billing_email">Email de facturation</Label>
                <Input id="billing_email" type="email" value={form.billing_email} disabled={!canEdit} onChange={(e) => set("billing_email", e.target.value)} placeholder="comptabilite@restaurant.ma" />
              </div>
            </div>
          </CardBody>
        </Card>

        {error && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm px-3 py-2">
            {error}
          </div>
        )}

        {canEdit ? (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? "Enregistré" : "Enregistrer"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Seul le propriétaire peut modifier ces informations.
          </p>
        )}
      </form>
    </>
  );
}
