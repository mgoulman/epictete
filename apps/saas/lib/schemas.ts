import { z } from "zod";

// Shared validation — imported by client forms AND server routes so the two never drift.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const money = z.coerce.number().min(0, "Montant invalide.").default(0);
const optionalText = z
  .string()
  .trim()
  .max(200)
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional();

export const paymentSourceSchema = z.object({
  name: z.string().trim().max(120).default(""),
  amount: z.coerce.number().default(0),
  counts_as_cash: z.boolean().default(false),
});

export const depenseSchema = z.object({
  label: z.string().trim().max(200).default(""),
  amount: z.coerce.number().default(0),
});

export const caisseSchema = z.object({
  entry_date: isoDate,
  total_ca: money,
  total_cb: money,
  glovo_ttc_espece: money,
  glovo_ttc_online: money,
  payment_sources: z.array(paymentSourceSchema).max(50).default([]),
  depenses: z.array(depenseSchema).max(100).default([]),
  manager_name: z.string().trim().max(120).default(""),
  especes_note: z.string().trim().max(500).default(""),
});
export type CaisseInput = z.infer<typeof caisseSchema>;

export const tenantProfileSchema = z.object({
  name: z.string().trim().min(1, "Le nom du restaurant est requis.").max(120),
  city: optionalText,
  ice: optionalText,
  rc: optionalText,
  billing_email: z.union([z.literal(""), z.string().trim().email("Email invalide.")]).optional(),
  branch_name: optionalText,
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide."),
  role: z.enum(["manager", "cashier"], { message: "Rôle invalide." }),
});

export const provisionSchema = z.object({
  restaurantName: z.string().trim().min(1, "Nom du restaurant requis.").max(120),
  city: z.string().trim().max(120).optional(),
  ownerEmail: z.string().trim().toLowerCase().email("Email du propriétaire invalide."),
});

export const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  password: z.string().max(200).optional(),
});

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(160),
  category: z.string().trim().max(120).optional().default(""),
  quantity: z.coerce.number().min(0, "Quantité invalide.").default(0),
  unit: z.string().trim().max(40).default("pièces"),
  minimum_stock: z.coerce.number().min(0, "Seuil invalide.").default(0),
  cost_per_unit: z.coerce.number().min(0, "Coût invalide.").default(0),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
