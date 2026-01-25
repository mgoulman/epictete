import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface MenuCategory {
  id: string;
  name: string;
  name_fr: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
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
  tags: string[];
  is_signature: boolean;
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
