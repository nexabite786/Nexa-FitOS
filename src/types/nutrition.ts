// ============================================================================
// NEXA FITOS — NUTRITION & MEAL PLANNING ENGINE TYPE DEFINITIONS
// ============================================================================

export type FoodCategory =
  | 'PROTEIN'
  | 'CARBS'
  | 'FATS'
  | 'DAIRY'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS'
  | 'BEVERAGES'
  | 'SNACKS'
  | 'SUPPLEMENTS'
  | 'OTHER';

export type FoodType = 'SYSTEM' | 'CUSTOM';

export type ServingUnit =
  | 'g'
  | 'ml'
  | 'oz'
  | 'serving'
  | 'piece'
  | 'tbsp'
  | 'tsp'
  | 'cup'
  | 'scoop';

export interface Food {
  id: string;
  tenantId?: string | null;
  name: string;
  category: FoodCategory;
  type: FoodType;
  brand?: string;
  barcode?: string;
  servingSize: number; // e.g. 100 for 100g, or 1 for 1 scoop
  servingUnit: ServingUnit;
  calories: number; // kcal per servingSize
  protein: number; // g per servingSize
  carbs: number; // g per servingSize
  fat: number; // g per servingSize
  fiber?: number; // g
  sugar?: number; // g
  sodium?: number; // mg
  imageUrl?: string;
  notes?: string;
  isArchived: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: ServingUnit | string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface Recipe {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  instructions: string[];
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  totalNutrition: MacroNutrients;
  perServingNutrition: MacroNutrients;
  isArchived: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MealType =
  | 'BREAKFAST'
  | 'MORNING_SNACK'
  | 'LUNCH'
  | 'AFTERNOON_SNACK'
  | 'DINNER'
  | 'POST_WORKOUT'
  | 'PRE_WORKOUT'
  | 'SNACK'
  | 'CUSTOM';

export interface PlanMealItem {
  id: string;
  type: 'FOOD' | 'RECIPE';
  referenceId: string;
  name: string;
  quantity: number;
  unit: ServingUnit | string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface PlanMeal {
  id: string;
  name: string;
  type: MealType;
  time?: string;
  notes?: string;
  items: PlanMealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
}

export interface MealPlanDay {
  id: string;
  dayNumber: number;
  name: string; // e.g. "Day 1 - High Carb"
  meals: PlanMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
}

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface MealPlan {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  durationDays?: number;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTargetMl: number;
  notes?: string;
  status: PlanStatus;
  days: MealPlanDay[];
  version: number;
  assignedClientCount?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type NutritionAssignmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface NutritionAssignment {
  id: string;
  tenantId: string;
  clientId: string;
  planId: string;
  planName: string;
  planSnapshot?: MealPlan;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status: NutritionAssignmentStatus;
  assignedBy: string;
  assignedByName?: string;
  customCalorieTarget?: number;
  customProteinTarget?: number;
  customCarbsTarget?: number;
  customFatTarget?: number;
  customWaterTargetMl?: number;
  assignedAt: string;
  updatedAt?: string;
}

export interface FoodLogEntry {
  id: string;
  tenantId: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  mealCustomName?: string;
  foodId?: string;
  recipeId?: string;
  foodNameSnapshot: string;
  quantity: number;
  unit: ServingUnit | string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WaterLogEntry {
  id: string;
  tenantId: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  recordedAt: string;
  createdAt: string;
}

export interface NutritionTargets {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTargetMl: number;
  source: 'PLAN' | 'CUSTOM' | 'DEFAULT';
  planName?: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  waterMl: number;
  targets: NutritionTargets;
  mealBreakdown: Record<MealType, {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    entries: FoodLogEntry[];
  }>;
  entriesCount: number;
}

export interface NutritionAdherenceReport {
  periodDays: number;
  daysWithLogs: number;
  loggingAdherencePercentage: number;
  daysMetCalorieTarget: number;
  targetAdherencePercentage: number;
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  avgDailyWaterMl: number;
}
