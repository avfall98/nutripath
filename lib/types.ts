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
}

export type MealGroupDTO = {
  id: number
  name: string
  sortOrder: number
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
}
