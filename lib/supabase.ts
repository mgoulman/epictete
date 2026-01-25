import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  // Time-based availability
  availability_type: AvailabilityType;
  available_start_time: string | null; // HH:MM:SS format
  available_end_time: string | null;   // HH:MM:SS format
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
  tags: string[];
  is_signature: boolean;
  chef_note: string | null;
  is_available: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
