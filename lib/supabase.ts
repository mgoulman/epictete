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
  created_at: string;
  updated_at: string;
}
