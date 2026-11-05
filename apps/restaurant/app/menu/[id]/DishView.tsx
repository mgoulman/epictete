"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, ChevronDown } from "lucide-react";
import { TAG_INFO, type MenuTag } from "@/lib/menu-types";

export type RelatedDish = {
  id: string; name: string; name_fr: string | null; price: number | string; image_url: string | null;
};

type Props = {
  name: string;
  catLabel: string;
  price: number;
  description: string | null;
  ingredients: string[];
  tags: MenuTag[];
  image: string | null;
  isSignature: boolean;
  chefNote: string | null;
  related: RelatedDish[];
  backHref: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.75, delay: d, ease: EASE },
});

export function DishView({
  name, catLabel, price, description, ingredients, tags, image, isSignature, chefNote, related, backHref,
}: Props) {
  return (
    <main className="bg-background">
      {/* ─── HERO · whole plate stacked on mobile, cinematic full-bleed on desktop ─── */}
      <section className="relative overflow-hidden bg-[#0f110b] lg:min-h-[94svh]">
        {/* PLATE — full 4:3 (whole dish, uncropped) on mobile, full-bleed on desktop */}
        <div className="relative aspect-4/3 w-full lg:absolute lg:inset-0 lg:aspect-auto lg:h-full">
          {image ? (
            <motion.div
              initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: EASE }} className="absolute inset-0">
              <Image src={image} alt={name} fill priority sizes="100vw"
                className="object-cover object-center lg:object-[62%_center]" />
            </motion.div>
          ) : null}
          {/* mobile: soften the plate's bottom edge into the text area */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0f110b] to-transparent lg:hidden" />
          {/* desktop scrim: dark over the text (left), plate stays clear on the right */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#0f110b] from-0% via-[#0f110b]/55 via-[38%] to-transparent to-[68%] lg:block" />
          {/* desktop cinematic top + bottom vignette for depth */}
          <div className="absolute inset-0 hidden bg-gradient-to-b from-[#0f110b]/55 via-transparent via-[32%] to-[#0f110b]/85 lg:block" />
        </div>

        {/* gold inset frame (desktop) */}
        <div className="pointer-events-none absolute inset-6 hidden border border-[#cfc78f]/15 lg:block" />

        {/* text */}
        <div className="relative z-10 lg:flex lg:min-h-[94svh] lg:items-center">
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <div className="max-w-xl pt-9 pb-14 lg:pt-24 lg:pb-0">
              <motion.div {...reveal(0)} className="flex items-center justify-between">
                <Link href={backHref}
                  className="inline-flex items-center gap-2 text-sm text-[#f3f1e7]/60 transition-colors hover:text-[#cfc78f]">
                  <ArrowLeft size={16} /> Notre Carte
                </Link>
              </motion.div>

              <motion.div {...reveal(0.04)} className="mt-8 flex items-center gap-4 lg:mt-10">
                <span className="h-px w-10 bg-[#cfc78f]/50" />
                <p className="text-xs uppercase tracking-[0.42em] text-[#cfc78f]">{catLabel}</p>
              </motion.div>

              <motion.h1 {...reveal(0.1)}
                className="mt-5 font-heading text-[2.35rem] font-medium leading-[1.03] tracking-[-0.01em] text-[#f6f4ea] sm:text-5xl lg:text-[4.9rem] lg:leading-[0.96]">
                {name}
              </motion.h1>

              {isSignature && (
                <motion.div {...reveal(0.14)} className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#cfc78f]">
                  <Star size={14} className="fill-current" /> Signature du Chef
                </motion.div>
              )}

              {description && (
                <motion.p {...reveal(0.18)}
                  className="mt-6 max-w-md font-heading text-lg italic leading-relaxed text-[#f3f1e7]/80 sm:text-xl lg:mt-7 lg:text-2xl">
                  {description}
                </motion.p>
              )}

              <motion.div {...reveal(0.24)} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 lg:mt-10">
                <span className="font-heading text-[2.2rem] leading-none text-[#cfc78f] sm:text-[2.6rem]">
                  {price}<span className="ml-2 align-middle text-sm tracking-wide text-[#f3f1e7]/55">DHS</span>
                </span>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {tags.map((t) => {
                      const info = TAG_INFO[t]; if (!info) return null;
                      return (
                        <span key={t} className="inline-flex items-center gap-1.5 text-sm text-[#f3f1e7]/70">
                          <span>{info.icon}</span>{info.labelFr}
                        </span>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              <motion.div {...reveal(0.3)} className="mt-10 lg:mt-12">
                <Link href="/reservation"
                  className="inline-flex items-center justify-center rounded-full border border-[#f3f1e7]/35 px-8 py-3.5 text-sm font-medium tracking-wide text-[#f6f4ea] backdrop-blur-sm transition-colors hover:border-[#cfc78f] hover:text-[#cfc78f]">
                  Réserver une table
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 text-[#f3f1e7]/40 lg:block">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown size={26} />
          </motion.div>
        </div>
      </section>

      {/* ─── COMPOSITION ────────────────────────────────────────── */}
      {ingredients.length > 0 && (
        <section className="bg-secondary/50 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <motion.p {...reveal(0)} className="mb-7 text-xs uppercase tracking-[0.32em] text-accent">
              La Composition
            </motion.p>
            <motion.div {...reveal(0.08)}
              className="flex flex-wrap items-center justify-center gap-y-3 font-heading text-xl leading-relaxed text-foreground/90 sm:text-2xl">
              {ingredients.map((ing, i) => (
                <span key={i} className="inline-flex items-center">
                  {i > 0 && <span className="mx-3 text-accent/45">•</span>}{ing}
                </span>
              ))}
            </motion.div>
            {chefNote && (
              <motion.p {...reveal(0.16)} className="mx-auto mt-12 max-w-xl text-muted-foreground">
                <span className="font-heading text-2xl italic text-accent/90">“</span>
                <span className="italic">{chefNote}</span>
                <span className="font-heading text-2xl italic text-accent/90">”</span>
              </motion.p>
            )}
          </div>
        </section>
      )}

      {/* ─── RELATED ─────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-6">
            <motion.h2 {...reveal(0)}
              className="mb-11 text-center font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Continuez l&apos;expérience
            </motion.h2>
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-3">
              {related.map((r, i) => (
                <motion.div key={r.id} {...reveal(i * 0.07)}>
                  <Link href={`/menu/${r.id}`} className="group block">
                    <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-secondary ring-1 ring-border/50">
                      {r.image_url && (
                        <Image src={r.image_url} alt={r.name_fr || r.name} fill sizes="(max-width:640px) 100vw, 33vw"
                          className="object-cover transition-transform duration-[650ms] ease-out group-hover:scale-[1.06]" />
                      )}
                    </div>
                    <div className="mt-3.5 flex items-baseline justify-between gap-3">
                      <span className="font-heading text-lg text-foreground transition-colors group-hover:text-accent">
                        {r.name_fr || r.name}
                      </span>
                      <span className="shrink-0 text-sm text-accent">{Number(r.price)} DH</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
