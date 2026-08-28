"use server"

import { db } from "@/lib/db"
import { foods, meals, mealIngredients } from "@/lib/db/schema"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { num, num0, toNumeric } from "@/lib/format"
import type { IngredientMode, MealDTO, MealIngredientDTO } from "@/lib/types"
import { requireUserId } from "@/lib/session"

type MealRow = typeof meals.$inferSelect
type IngredientRow = typeof mealIngredients.$inferSelect
type FoodRow = typeof foods.$inferSelect

function serializeIngredient(row: IngredientRow, food: FoodRow): MealIngredientDTO {
  return {
    id: row.id,
    foodId: row.foodId,
    amount: num0(row.amount),
    mode: (row.mode === "weight" ? "weight" : "serving") as IngredientMode,
    sortOrder: row.sortOrder,
    name: food.name,
    brand: food.brand,
    servingSize: food.servingSize,
    imageUrl: food.imageUrl,
    calories: num0(food.calories),
    protein: num0(food.protein),
    carbs: num(food.carbs),
    fat: num(food.fat),
  }
}

// Assemble full meal DTOs (with their ingredients) for a set of meal rows.
async function withIngredients(userId: string, mealRows: MealRow[]): Promise<MealDTO[]> {
  if (mealRows.length === 0) return []
  const mealIds = mealRows.map((m) => m.id)
  const rows = await db
    .select({ ingredient: mealIngredients, food: foods })
    .from(mealIngredients)
    .innerJoin(foods, eq(mealIngredients.foodId, foods.id))
    .where(inArray(mealIngredients.mealId, mealIds))
    .orderBy(asc(mealIngredients.sortOrder), asc(mealIngredients.id))

  const byMeal = new Map<number, MealIngredientDTO[]>()
  for (const { ingredient, food } of rows) {
    if (food.userId !== userId) continue
    const list = byMeal.get(ingredient.mealId) ?? []
    list.push(serializeIngredient(ingredient, food))
    byMeal.set(ingredient.mealId, list)
  }

  return mealRows.map((m) => ({
    id: m.id,
    name: m.name,
    imageUrl: m.imageUrl,
    favourite: m.favourite,
    ingredients: byMeal.get(m.id) ?? [],
  }))
}

export async function getMeals(): Promise<MealDTO[]> {
  const userId = await requireUserId()
  const mealRows = await db
    .select()
    .from(meals)
    .where(eq(meals.userId, userId))
    .orderBy(desc(meals.createdAt))
  return withIngredients(userId, mealRows)
}

export async function getMealById(id: number): Promise<MealDTO | null> {
  const userId = await requireUserId()
  const mealRows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
    .limit(1)
  if (!mealRows[0]) return null
  const [meal] = await withIngredients(userId, mealRows)
  return meal ?? null
}

// Favourite meals, for the "Favs" filter / add-entry dialog.
export async function getFavouriteMeals(): Promise<MealDTO[]> {
  const userId = await requireUserId()
  const mealRows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), eq(meals.favourite, true)))
    .orderBy(desc(meals.createdAt))
  return withIngredients(userId, mealRows)
}

export type MealIngredientInput = {
  foodId: number
  amount: number
  mode: IngredientMode
}

export type MealInput = {
  name: string
  imageUrl?: string | null
  ingredients: MealIngredientInput[]
}

// Only keep ingredients whose food belongs to the current user.
async function ownedFoodIds(userId: string, foodIds: number[]): Promise<Set<number>> {
  if (foodIds.length === 0) return new Set()
  const rows = await db
    .select({ id: foods.id })
    .from(foods)
    .where(and(eq(foods.userId, userId), inArray(foods.id, foodIds)))
  return new Set(rows.map((r) => r.id))
}

async function replaceIngredients(userId: string, mealId: number, ingredients: MealIngredientInput[]) {
  await db.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId))
  const owned = await ownedFoodIds(
    userId,
    ingredients.map((i) => i.foodId),
  )
  const values = ingredients
    .filter((i) => owned.has(i.foodId))
    .map((i, index) => ({
      mealId,
      foodId: i.foodId,
      amount: toNumeric(i.amount) ?? "1",
      mode: i.mode === "weight" ? "weight" : "serving",
      sortOrder: index,
    }))
  if (values.length > 0) await db.insert(mealIngredients).values(values)
}

export async function createMeal(input: MealInput): Promise<MealDTO> {
  const userId = await requireUserId()
  const name = input.name.trim()
  if (!name) throw new Error("Meal needs a name")
  const [row] = await db
    .insert(meals)
    .values({ userId, name, imageUrl: input.imageUrl || null })
    .returning()
  await replaceIngredients(userId, row.id, input.ingredients)
  revalidatePath("/meals")
  revalidatePath("/")
  const meal = await getMealById(row.id)
  return meal!
}

export async function updateMeal(id: number, input: MealInput): Promise<MealDTO> {
  const userId = await requireUserId()
  const name = input.name.trim()
  if (!name) throw new Error("Meal needs a name")
  const [row] = await db
    .update(meals)
    .set({ name, imageUrl: input.imageUrl || null })
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
    .returning()
  if (!row) throw new Error("Meal not found")
  await replaceIngredients(userId, id, input.ingredients)
  revalidatePath("/meals")
  revalidatePath("/")
  const meal = await getMealById(id)
  return meal!
}

export async function deleteMeal(id: number) {
  const userId = await requireUserId()
  await db.delete(meals).where(and(eq(meals.id, id), eq(meals.userId, userId)))
  revalidatePath("/meals")
  revalidatePath("/")
}

export async function toggleMealFavourite(id: number, favourite: boolean) {
  const userId = await requireUserId()
  await db
    .update(meals)
    .set({ favourite })
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
  revalidatePath("/meals")
  revalidatePath("/")
}

// Copy a meal (and its ingredients) into a new "… (copy)" meal.
export async function duplicateMeal(id: number): Promise<MealDTO> {
  const userId = await requireUserId()
  const source = await getMealById(id)
  if (!source) throw new Error("Meal not found")
  return createMeal({
    name: `${source.name} (copy)`,
    imageUrl: source.imageUrl,
    ingredients: source.ingredients.map((i) => ({ foodId: i.foodId, amount: i.amount, mode: i.mode })),
  })
}
