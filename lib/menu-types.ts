// Menu Types for Epictete Digital Menu

export type MenuCategory = 
  | 'antipasti'
  | 'salades'
  | 'paste'
  | 'pizze'
  | 'secondi'
  | 'ravioli'
  | 'risotto'
  | 'burger'
  | 'dolci'
  | 'beverages';

export type MenuTag = 
  | 'vegetarian'
  | 'seafood'
  | 'truffle'
  | 'spicy'
  | 'signature'
  | 'cheese'
  | 'meat'
  | 'healthy';

export type PastaType = 
  | 'spaghetti'
  | 'linguine'
  | 'penne'
  | 'rigatoni'
  | 'tagliatelle';

export type SauceOption = 
  | 'champignons'
  | 'poivre-vert'
  | 'truffe'
  | 'cafe-paris';

export interface Customization {
  type: 'pasta' | 'sauce' | 'size';
  options: string[];
  label: string;
  labelFr: string;
}

// Italian regions for origin badges
export type ItalianRegion = 
  | 'napoli'
  | 'roma'
  | 'sicilia'
  | 'toscana'
  | 'emilia-romagna'
  | 'lombardia'
  | 'veneto'
  | 'piemonte'
  | 'liguria'
  | 'puglia'
  | 'campania'
  | 'sardegna'
  | 'mediterranee'
  | 'international';

export interface DishStory {
  region: ItalianRegion;
  narrative: string;          // Complete, memorable story paragraph combining history, sensory, culture
  funFact?: string;           // Optional "flex" fact for social sharing
  familyId?: string;          // For grouping related dishes (arancini, risotto, etc.)
}

export interface MenuItem {
  id: string;
  name: string;
  nameFr: string;
  price: number;
  priceSmall?: number;
  priceLarge?: number;
  description: string;
  descriptionEn?: string;
  ingredients: string[];
  ingredientsEn?: string[];
  category: MenuCategory;
  tags: MenuTag[];
  customizations?: Customization[];
  isSignature?: boolean;
  chefNote?: string;
  image?: string;
  // Story & cultural info
  story?: DishStory;
}

export interface MenuCategoryInfo {
  id: MenuCategory;
  name: string;
  nameFr: string;
  icon: string;
  description?: string;
}

export interface MenuFilters {
  search: string;
  tags: MenuTag[];
  priceRange: [number, number] | null;
  category: MenuCategory | null;
}

// Category metadata
export const MENU_CATEGORIES: MenuCategoryInfo[] = [
  { id: 'antipasti', name: 'Antipasti', nameFr: 'Antipasti', icon: '🍽️', description: 'Starters & appetizers' },
  { id: 'salades', name: 'Salads', nameFr: 'Salades', icon: '🥗', description: 'Fresh salads' },
  { id: 'paste', name: 'Pasta', nameFr: 'Pâtes', icon: '🍝', description: 'Fresh homemade pasta' },
  { id: 'pizze', name: 'Pizza', nameFr: 'Pizze Napoletane', icon: '🍕', description: 'Neapolitan pizzas' },
  { id: 'secondi', name: 'Main Courses', nameFr: 'Secondi Piatti', icon: '🍖', description: 'Meat & fish' },
  { id: 'ravioli', name: 'Ravioli', nameFr: 'Ravioli', icon: '🥟', description: 'Stuffed pasta' },
  { id: 'risotto', name: 'Risotto', nameFr: 'Risotto', icon: '🍚', description: 'Creamy rice dishes' },
  { id: 'burger', name: 'Burgers', nameFr: 'Burger', icon: '🍔', description: 'Gourmet burgers' },
  { id: 'dolci', name: 'Desserts', nameFr: 'Dolci', icon: '🍰', description: 'Sweet endings' },
  { id: 'beverages', name: 'Drinks', nameFr: 'Boissons', icon: '☕', description: 'Beverages & cocktails' },
];

// Tag display info
export const TAG_INFO: Record<MenuTag, { label: string; labelFr: string; icon: string; color: string }> = {
  vegetarian: { label: 'Vegetarian', labelFr: 'Végétarien', icon: '🌱', color: 'text-green-500' },
  seafood: { label: 'Seafood', labelFr: 'Fruits de mer', icon: '🦐', color: 'text-blue-400' },
  truffle: { label: 'Truffle', labelFr: 'Truffe', icon: '🍄', color: 'text-amber-600' },
  spicy: { label: 'Spicy', labelFr: 'Épicé', icon: '🌶️', color: 'text-red-500' },
  signature: { label: 'Signature', labelFr: 'Signature', icon: '⭐', color: 'text-accent' },
  cheese: { label: 'Cheese', labelFr: 'Fromage', icon: '🧀', color: 'text-yellow-500' },
  meat: { label: 'Meat', labelFr: 'Viande', icon: '🥩', color: 'text-red-400' },
  healthy: { label: 'Healthy', labelFr: 'Santé', icon: '💪', color: 'text-green-400' },
};

// Pasta customization
export const PASTA_OPTIONS: Customization = {
  type: 'pasta',
  label: 'Choose your pasta',
  labelFr: 'Choisissez vos pâtes',
  options: ['Spaghetti', 'Linguine', 'Penne', 'Rigatoni', 'Tagliatelle fraîches'],
};

// Sauce customization for steaks
export const SAUCE_OPTIONS: Customization = {
  type: 'sauce',
  label: 'Choose your sauce',
  labelFr: 'Choisissez votre sauce',
  options: ['Champignons', 'Poivre vert', 'Crème de truffe', 'Café de Paris'],
};

// Region display info
export const REGION_INFO: Record<ItalianRegion, { name: string; nameFr: string; emoji: string }> = {
  napoli: { name: 'Naples', nameFr: 'Naples', emoji: '🌋' },
  roma: { name: 'Rome', nameFr: 'Rome', emoji: '🏛️' },
  sicilia: { name: 'Sicily', nameFr: 'Sicile', emoji: '🍋' },
  toscana: { name: 'Tuscany', nameFr: 'Toscane', emoji: '🍷' },
  'emilia-romagna': { name: 'Emilia-Romagna', nameFr: 'Émilie-Romagne', emoji: '🧀' },
  lombardia: { name: 'Lombardy', nameFr: 'Lombardie', emoji: '🏔️' },
  veneto: { name: 'Veneto', nameFr: 'Vénétie', emoji: '🎭' },
  piemonte: { name: 'Piedmont', nameFr: 'Piémont', emoji: '🍄' },
  liguria: { name: 'Liguria', nameFr: 'Ligurie', emoji: '🌊' },
  puglia: { name: 'Puglia', nameFr: 'Pouilles', emoji: '🫒' },
  campania: { name: 'Campania', nameFr: 'Campanie', emoji: '🍅' },
  sardegna: { name: 'Sardinia', nameFr: 'Sardaigne', emoji: '🐚' },
  mediterranee: { name: 'Mediterranean', nameFr: 'Méditerranée', emoji: '🌊' },
  international: { name: 'International', nameFr: 'International', emoji: '🌍' },
};
