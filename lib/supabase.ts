// Client-compatible Supabase replacement
// Uses the browser client (API proxy) — NOT the server-side pg pool
// This file is imported by client components

import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export const supabase = createSupabaseBrowserClient();

// Types for database tables
export type AvailabilityType = 'always' | 'breakfast' | 'brunch' | 'custom';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface MenuCategory {
  id: string;
  name: string;
  name_fr: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  availability_type: AvailabilityType;
  available_start_time: string | null;
  available_end_time: string | null;
  available_days: DayOfWeek[] | null;
}

export interface MenuItem {
  id: string;
  name: string;
  name_fr: string;
  price: number;
  price_small: number | null;
  price_large: number | null;
  description: string | null;
  description_en: string | null;
  ingredients: string[];
  ingredients_en: string[];
  category_id: string | null;
  extra_category_ids: string[];
  tags: string[];
  is_signature: boolean;
  is_featured: boolean;
  chef_note: string | null;
  is_available: boolean;
  image_url: string | null;
  sort_order: number;
  recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  name_fr: string | null;
  category: string | null;
  portions: number;
  cost_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}
