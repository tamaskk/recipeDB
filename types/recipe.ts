/**
 * Supported languages in the Recipe DB
 */
export type Language = 'en' | 'de' | 'nl' | 'hu' | 'fr' | 'es' | 'pt';

/**
 * Language names mapping
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  hu: 'Hungarian',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
};

/**
 * Multilingual text field
 */
export interface MultilingualText {
  language: Language;
  text: string;
}

/**
 * Recipe step with multilingual support
 */
export interface RecipeStep {
  stepNumber: number;
  instructions: MultilingualText[];
  imageUrl?: string;
  timeMinutes?: number;
}

/**
 * Ingredient with multilingual support
 */
export interface Ingredient {
  name: MultilingualText[];
  amount: number;
  unit: MultilingualText[];
  notes?: MultilingualText[];
  isOptional?: boolean;
  category?: MultilingualText[]; // e.g., "Vegetables", "Spices", "Dairy"
}

/**
 * Nutritional macros
 */
export interface NutritionalMacros {
  calories: number; // kcal
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  saturatedFat?: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // milligrams
  cholesterol?: number; // milligrams
  potassium?: number; // milligrams
  calcium?: number; // milligrams
  iron?: number; // milligrams
  vitaminA?: number; // IU
  vitaminC?: number; // milligrams
}

/**
 * Time information for recipe preparation
 */
export interface RecipeTime {
  prepMinutes: number; // Preparation time
  cookMinutes: number; // Cooking time
  restMinutes?: number; // Resting/marinating time
  totalMinutes: number; // Total time (calculated)
}

/**
 * Recipe difficulty level (1-10)
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Meal type
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'appetizer' | 'beverage' | 'other' | 'condiment' | 'drink';

/**
 * Cuisine type - can be a single country string or an array of countries
 * Examples: "hungarian" or ["hungarian", "slovakian", "slovenian"]
 */
export type CuisineType = string | string[];

/**
 * Dietary restrictions/preferences
 */
export type DietaryTag = 
  | 'vegetarian' 
  | 'vegan' 
  | 'gluten-free' 
  | 'dairy-free' 
  | 'nut-free' 
  | 'halal' 
  | 'kosher' 
  | 'low-carb' 
  | 'keto' 
  | 'paleo' 
  | 'low-fat' 
  | 'high-protein' 
  | 'sugar-free';

/**
 * Cooking method
 */
export type CookingMethod = 
  | 'baking' 
  | 'grilling' 
  | 'frying' 
  | 'deep-frying'
  | 'pan-frying'
  | 'stir-frying'
  | 'sauteing'
  | 'boiling' 
  | 'simmering'
  | 'poaching'
  | 'blanching'
  | 'steaming' 
  | 'roasting' 
  | 'broiling'
  | 'braising'
  | 'stewing'
  | 'slow-cooking' 
  | 'pressure-cooking' 
  | 'sous-vide'
  | 'smoking'
  | 'curing'
  | 'fermenting'
  | 'marinating'
  | 'raw' 
  | 'no-cook'
  | 'microwaving'
  | 'air-frying'
  | 'other';

/**
 * Valid cooking methods array for filtering
 */
export const VALID_COOKING_METHODS: CookingMethod[] = [
  'baking', 'grilling', 'frying', 'deep-frying', 'pan-frying', 'stir-frying', 'sauteing',
  'boiling', 'simmering', 'poaching', 'blanching', 'steaming', 'roasting', 'broiling',
  'braising', 'stewing', 'slow-cooking', 'pressure-cooking', 'sous-vide', 'smoking',
  'curing', 'fermenting', 'marinating', 'raw', 'no-cook', 'microwaving', 'air-frying', 'other'
];

/**
 * Main Recipe model
 */
export interface Recipe {
  // Identification
  id: string;
  slug: MultilingualText[]; // URL-friendly identifier for each language
  
  // Basic information (multilingual)
  name: MultilingualText[];
  description: MultilingualText[]; // Short description/summary
  info: MultilingualText[]; // Additional information/notes
  
  // Recipe content (multilingual)
  ingredients: Ingredient[];
  steps: RecipeStep[];
  
  // Metadata
  difficulty: DifficultyLevel; // 1-10 scale
  servings: number; // Number of servings
  servingsUnit?: MultilingualText[]; // e.g., "people", "portions"
  
  // Time information
  time: RecipeTime;
  
  // Nutritional information
  macros: NutritionalMacros;
  macrosPerServing?: NutritionalMacros; // Optional: per-serving macros
  
  // Categorization
  mealType: MealType;
  cuisineType: CuisineType;
  tags: MultilingualText[][]; // Array of tag arrays (each tag is multilingual)
  dietaryTags: DietaryTag[];
  cookingMethods: CookingMethod[];
  
  // Media
  imageUrl?: string;
  imageUrls?: string[]; // Multiple images
  videoUrl?: string;
  
  // Additional information
  equipment?: MultilingualText[][]; // Required equipment/tools
  tips?: MultilingualText[]; // Cooking tips
  variations?: MultilingualText[]; // Recipe variations
  storage?: MultilingualText[]; // Storage instructions
  reheating?: MultilingualText[]; // Reheating instructions
  
  // Source and attribution
  sourceUrl?: string;
  sourceName?: MultilingualText[];
  author?: MultilingualText[];
  authorId?: string; // If stored in database
  
  // Ratings and reviews
  rating?: number; // Average rating (0-5)
  ratingCount?: number; // Number of ratings
  favoriteCount?: number; // Number of times favorited
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Status
  isPublished: boolean;
  isFeatured?: boolean;
  
  // SEO and metadata
  keywords?: MultilingualText[][]; // SEO keywords per language
  metaDescription?: MultilingualText[];
  
  // Related recipes
  relatedRecipeIds?: string[];
  
  // Versioning
  version?: number; // Recipe version number
  parentRecipeId?: string; // If this is a variation of another recipe
}

/**
 * Helper type for creating a new recipe (without auto-generated fields)
 */
export type CreateRecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string; // Optional, can be auto-generated
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Helper type for updating a recipe (all fields optional except id)
 */
export type UpdateRecipeInput = Partial<Omit<Recipe, 'id'>> & {
  id: string;
  updatedAt?: Date;
};

/**
 * Helper function to get text in a specific language
 */
export function getTextByLanguage(
  multilingualText: MultilingualText[],
  language: Language,
  fallbackLanguage: Language = 'en'
): string {
  const text = multilingualText.find(t => t.language === language);
  if (text) return text.text;
  
  const fallback = multilingualText.find(t => t.language === fallbackLanguage);
  if (fallback) return fallback.text;
  
  return multilingualText[0]?.text || '';
}

/**
 * Helper function to get all languages present in a multilingual field
 */
export function getAvailableLanguages(
  multilingualText: MultilingualText[]
): Language[] {
  return multilingualText.map(t => t.language);
}

