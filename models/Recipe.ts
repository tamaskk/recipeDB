import mongoose, { Schema, Document, Model } from 'mongoose';
import { Recipe, Language, MultilingualText, RecipeStep, Ingredient, NutritionalMacros, RecipeTime, DifficultyLevel, MealType, CuisineType, DietaryTag, CookingMethod } from '@/types/recipe';

// Extend Document to include Recipe fields
export interface RecipeDocument extends Omit<Recipe, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

// Schema for MultilingualText
const MultilingualTextSchema = new Schema({
  language: {
    type: String,
    enum: ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
}, { _id: false });

// Schema for RecipeStep
const RecipeStepSchema = new Schema({
  stepNumber: {
    type: Number,
    required: true,
  },
  instructions: {
    type: [MultilingualTextSchema],
    required: true,
  },
  imageUrl: String,
  timeMinutes: Number,
}, { _id: false });

// Schema for Ingredient
const IngredientSchema = new Schema({
  name: {
    type: [MultilingualTextSchema],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  unit: {
    type: [MultilingualTextSchema],
    required: true,
  },
  notes: [MultilingualTextSchema],
  isOptional: {
    type: Boolean,
    default: false,
  },
  category: [MultilingualTextSchema],
}, { _id: false });

// Schema for NutritionalMacros
const NutritionalMacrosSchema = new Schema({
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbohydrates: { type: Number, required: true },
  fat: { type: Number, required: true },
  saturatedFat: Number,
  fiber: Number,
  sugar: Number,
  sodium: Number,
  cholesterol: Number,
  potassium: Number,
  calcium: Number,
  iron: Number,
  vitaminA: Number,
  vitaminC: Number,
}, { _id: false });

// Schema for RecipeTime
const RecipeTimeSchema = new Schema({
  prepMinutes: { type: Number, required: true },
  cookMinutes: { type: Number, required: true },
  restMinutes: Number,
  totalMinutes: { type: Number, required: true },
}, { _id: false });

// Main Recipe Schema
const RecipeSchema = new Schema<RecipeDocument>(
  {
    // Identification
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: [MultilingualTextSchema],
      required: true,
    },

    // Basic information
    name: {
      type: [MultilingualTextSchema],
      required: true,
    },
    description: {
      type: [MultilingualTextSchema],
      required: true,
    },
    info: {
      type: [MultilingualTextSchema],
      default: [],
    },

    // Recipe content
    ingredients: {
      type: [IngredientSchema],
      required: true,
    },
    steps: {
      type: [RecipeStepSchema],
      required: true,
    },

    // Metadata
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    servings: {
      type: Number,
      required: true,
    },
    servingsUnit: [MultilingualTextSchema],

    // Time information
    time: {
      type: RecipeTimeSchema,
      required: true,
    },

    // Nutritional information
    macros: {
      type: NutritionalMacrosSchema,
      required: true,
    },
    macrosPerServing: NutritionalMacrosSchema,

    // Categorization
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer', 'beverage', 'other', 'condiment', 'drink'],
      required: true,
    },
    cuisineType: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(value: any) {
          // Allow string or array of strings
          if (typeof value === 'string') return true;
          if (Array.isArray(value)) {
            return value.every(item => typeof item === 'string');
          }
          return false;
        },
        message: 'cuisineType must be a string or an array of strings'
      }
    },
    tags: [[MultilingualTextSchema]],
    dietaryTags: {
      type: [String],
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'low-carb', 'keto', 'paleo', 'low-fat', 'high-protein', 'sugar-free'],
      default: [],
    },
    cookingMethods: {
      type: [String],
      enum: [
        'baking', 'grilling', 'frying', 'deep-frying', 'pan-frying', 'stir-frying', 'sauteing',
        'boiling', 'simmering', 'poaching', 'blanching', 'steaming', 'roasting', 'broiling',
        'braising', 'stewing', 'slow-cooking', 'pressure-cooking', 'sous-vide', 'smoking',
        'curing', 'fermenting', 'marinating', 'raw', 'no-cook', 'microwaving', 'air-frying', 'other'
      ],
      default: [],
    },

    // Media
    imageUrl: String,
    imageUrls: [String],
    videoUrl: String,

    // Additional information
    equipment: [[MultilingualTextSchema]],
    tips: [MultilingualTextSchema],
    variations: [MultilingualTextSchema],
    storage: [MultilingualTextSchema],
    reheating: [MultilingualTextSchema],

    // Source and attribution
    sourceUrl: String,
    sourceName: [MultilingualTextSchema],
    author: [MultilingualTextSchema],
    authorId: String,

    // Ratings and reviews
    rating: Number,
    ratingCount: Number,
    favoriteCount: Number,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: Date,

    // Status
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // SEO and metadata
    keywords: [[MultilingualTextSchema]],
    metaDescription: [MultilingualTextSchema],

    // Related recipes
    relatedRecipeIds: [String],

    // Versioning
    version: Number,
    parentRecipeId: String,
  },
  {
    timestamps: false, // We're handling timestamps manually
    collection: 'recipes',
  }
);

// Indexes for better query performance
// Note: id already has index: true in schema definition
RecipeSchema.index({ 'slug.language': 1, 'slug.text': 1 });
RecipeSchema.index({ 'name.language': 1 });
RecipeSchema.index({ mealType: 1 });
RecipeSchema.index({ cuisineType: 1 });
RecipeSchema.index({ isPublished: 1 });
RecipeSchema.index({ isFeatured: 1 });
RecipeSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
RecipeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Convert _id to id in toJSON
RecipeSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const RecipeModel: Model<RecipeDocument> = mongoose.models.Recipe || mongoose.model<RecipeDocument>('Recipe', RecipeSchema);

export default RecipeModel;

