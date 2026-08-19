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

export const EXPENSE_CATEGORIES = ["vendor_order", "market_purchase", "utilities", "equipment", "cleaning", "transport", "maintenance", "salary_advance", "other"] as const;
export const PAYMENT_METHODS = ["cash", "card_pro", "tpe"] as const;

export const expenseSchema = z.object({
  expense_date: isoDate,
  amount: z.coerce.number().positive("Montant requis."),
  payment_method: z.enum(PAYMENT_METHODS, { message: "Mode de paiement requis." }),
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().trim().max(300).optional().default(""),
});

export const vendorSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(160),
  contact_name: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
});

export const vendorTxnSchema = z.object({
  vendor_id: z.string().uuid("Fournisseur requis."),
  type: z.enum(["debt", "payment"], { message: "Type requis." }),
  amount: z.coerce.number().positive("Montant requis."),
  date: isoDate,
  description: z.string().trim().max(200).optional().default(""),
});

export const staffSchema = z.object({
  first_name: z.string().trim().min(1, "Prénom requis.").max(80),
  last_name: z.string().trim().min(1, "Nom requis.").max(80),
  position: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(120).optional(),
  current_password: z.string().max(200).optional(),
  new_password: z.string().min(8, "8 caractères minimum.").max(200).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "8 caractères minimum.").max(200),
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
