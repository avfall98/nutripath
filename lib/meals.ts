import { parseServingWeight } from "@/lib/nutrition"
import type { MealDTO, MealIngredientDTO } from "@/lib/types"

// Foods (and therefore meal ingredients) store calories in kJ; the UI shows kcal.
const KJ_PER_KCAL = 4.184

// Number of servings an ingredient represents, given its amount + mode.
// Weight mode divides the entered weight by the food's own serving weight.
export function ingredientServings(ingredient: {
  amount: number
  mode: MealIngredientDTO["mode"]
  servingSize: string | null
}): number {
  if (ingredient.mode === "serving") return ingredient.amount
  const servingWeight = parseServingWeight(ingredient.servingSize)
  if (!servingWeight || servingWeight <= 0) return 0
  return ingredient.amount / servingWeight
}

// Nutrition contributed by a single ingredient at its chosen amount.
// kcal is returned in kilocalories; the raw kJ figure is kept for score maths.
export function ingredientNutrition(ingredient: MealIngredientDTO) {
  const servings = ingredientServings(ingredient)
  const servingWeight = parseServingWeight(ingredient.servingSize)
  return {
    servings,
    kj: ingredient.calories * servings,
    kcal: (ingredient.calories / KJ_PER_KCAL) * servings,
    protein: ingredient.protein * servings,
    carbs: ingredient.carbs != null ? ingredient.carbs * servings : 0,
    fat: ingredient.fat != null ? ingredient.fat * servings : 0,
    weightG: servingWeight != null ? servingWeight * servings : 0,
    hasCarbs: ingredient.carbs != null,
    hasFat: ingredient.fat != null,
  }
}

export type MealTotals = {
  kcal: number
  protein: number
  carbs: number | null
  fat: number | null
  weightG: number
  count: number
}

// Sum every ingredient into the meal's calculated total. Carbs/fat stay null
// only when no ingredient reports them, matching the foods/entries behaviour.
export function mealTotals(ingredients: MealIngredientDTO[]): MealTotals {
  let kcal = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let weightG = 0
  let hasCarbs = false
  let hasFat = false
  for (const ing of ingredients) {
    const n = ingredientNutrition(ing)
    kcal += n.kcal
    protein += n.protein
    carbs += n.carbs
    fat += n.fat
    weightG += n.weightG
    if (n.hasCarbs) hasCarbs = true
    if (n.hasFat) hasFat = true
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: hasCarbs ? Math.round(carbs) : null,
    fat: hasFat ? Math.round(fat) : null,
    weightG: Math.round(weightG),
    count: ingredients.length,
  }
}

// Convenience wrapper for a full meal DTO.
export function totalsForMeal(meal: MealDTO): MealTotals {
  return mealTotals(meal.ingredients)
}
