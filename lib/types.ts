export type ProfileDTO = {
  age: number | null
  sex: string | null
  heightCm: number | null
  weightKg: number | null
  targetWeightKg: number | null
  targetCalories: number | null
  targetProtein: number | null
  activityLevel: string | null
}

export type FoodDTO = {
  id: number
  name: string
  brand: string | null
  servingSize: string | null
  servingsPack: string | null
  packSize: string | null
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  saturatedFat: number | null
  sugars: number | null
  dietaryFiber: number | null
  sodium: number | null
  caloriesPerHundred: number | null
  proteinPerHundred: number | null
  carbsPerHundred: number | null
  fatPerHundred: number | null
  saturatedFatPerHundred: number | null
  sugarsPerHundred: number | null
  dietaryFiberPerHundred: number | null
  sodiumPerHundred: number | null
  imageUrl: string | null
  infoUrl: string | null
  favourite: boolean
}

export type MealGroupDTO = {
  id: number
  name: string
  sortOrder: number
}

// How much of a library food an ingredient uses:
//  - "serving": amount is a serving count
//  - "weight":  amount is grams/ml in the food's own serving unit
export type IngredientMode = "serving" | "weight"

export type MealIngredientDTO = {
  id: number
  foodId: number
  amount: number
  mode: IngredientMode
  sortOrder: number
  // A snapshot of the referenced library food, for display + calculation.
  name: string
  brand: string | null
  servingSize: string | null
  imageUrl: string | null
  // Per-serving nutrition. calories are stored in kJ (as with foods).
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
}

export type MealDTO = {
  id: number
  name: string
  imageUrl: string | null
  favourite: boolean
  ingredients: MealIngredientDTO[]
}

export type EntryDTO = {
  id: number
  entryDate: string
  mealGroupId: number | null
  mealGroupName: string
  foodId: number | null
  name: string
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  quantity: number
  servingSize: string | null
  servingWeightG?: number | null
  servingUnit?: "g" | "ml" | null
}
