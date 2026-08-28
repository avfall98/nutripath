"use server"

import { db } from "@/lib/db"
import { entries, foods, mealGroups, mealIngredients, meals, skippedDays } from "@/lib/db/schema"
import { and, asc, eq, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { num, num0, toNumeric } from "@/lib/format"
import { parseServingUnit, parseServingWeight } from "@/lib/nutrition"
import { ingredientServings } from "@/lib/meals"
import type { EntryDTO, IngredientMode } from "@/lib/types"
import { requireUserId } from "@/lib/session"

function serialize(r: typeof entries.$inferSelect): EntryDTO {
  return {
    id: r.id,
    entryDate: r.entryDate,
    mealGroupId: r.mealGroupId,
    mealGroupName: r.mealGroupName,
    foodId: r.foodId,
    name: r.name,
    calories: num0(r.calories),
    protein: num0(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    quantity: num0(r.quantity),
    servingSize: r.servingSize ?? null,
    servingWeightG: parseServingWeight(r.servingSize),
    servingUnit: r.servingSize ? parseServingUnit(r.servingSize) : null,
  }
}

// Verify a food belongs to the current user; returns the row or throws.
async function requireOwnedFood(userId: string, foodId: number) {
  const [food] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), eq(foods.userId, userId)))
    .limit(1)
  if (!food) throw new Error("Food not found")
  return food
}

// Verify a meal group belongs to the current user; throws if not.
async function requireOwnedMealGroup(userId: string, mealGroupId: number) {
  const [group] = await db
    .select({ id: mealGroups.id })
    .from(mealGroups)
    .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.userId, userId)))
    .limit(1)
  if (!group) throw new Error("Meal group not found")
}

export async function getEntriesByDate(dateKey: string): Promise<EntryDTO[]> {
  const userId = await requireUserId()
  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.entryDate, dateKey)))
    .orderBy(asc(entries.createdAt))
  return rows.map(serialize)
}

export async function getEntriesInRange(startKey: string, endKey: string): Promise<EntryDTO[]> {
  const userId = await requireUserId()
  const rows = await db
    .select({ entry: entries, servingSize: foods.servingSize })
    .from(entries)
    .leftJoin(foods, and(eq(entries.foodId, foods.id), eq(foods.userId, userId)))
    .where(and(eq(entries.userId, userId), gte(entries.entryDate, startKey), lte(entries.entryDate, endKey)))
    .orderBy(asc(entries.entryDate), asc(entries.createdAt))
  return rows.map(({ entry, servingSize }) => {
    // Prefer the entry's own serving size (custom entries); fall back to the linked food's.
    const effectiveServing = entry.servingSize ?? servingSize
    return {
      ...serialize(entry),
      servingSize: effectiveServing ?? null,
      servingWeightG: parseServingWeight(effectiveServing),
      servingUnit: effectiveServing ? parseServingUnit(effectiveServing) : null,
    }
  })
}

// Add an entry from an existing reusable food.
export async function addEntryFromFood(input: {
  dateKey: string
  foodId: number
  mealGroupId: number
  mealGroupName: string
  quantity: number
}) {
  const userId = await requireUserId()
  const food = await requireOwnedFood(userId, input.foodId)
  await requireOwnedMealGroup(userId, input.mealGroupId)
  await db.insert(entries).values({
    userId,
    entryDate: input.dateKey,
    mealGroupId: input.mealGroupId,
    mealGroupName: input.mealGroupName,
    foodId: food.id,
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    quantity: toNumeric(input.quantity) ?? "1",
  })
  revalidatePath("/")
}

// Add a saved meal to the log. Each ingredient becomes its own linked entry so
// the daily log still shows the individual foods and stays editable. The meal's
// nutrition is never stored — quantities are recomputed from the ingredients.
// `mealQuantity` multiplies every ingredient (e.g. 2 = two servings of the meal).
export async function addEntriesFromMeal(input: {
  dateKey: string
  mealId: number
  mealGroupId: number
  mealGroupName: string
  mealQuantity?: number
}) {
  const userId = await requireUserId()
  await requireOwnedMealGroup(userId, input.mealGroupId)

  const [meal] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(and(eq(meals.id, input.mealId), eq(meals.userId, userId)))
    .limit(1)
  if (!meal) throw new Error("Meal not found")

  const rows = await db
    .select({ ingredient: mealIngredients, food: foods })
    .from(mealIngredients)
    .innerJoin(foods, eq(mealIngredients.foodId, foods.id))
    .where(eq(mealIngredients.mealId, meal.id))
    .orderBy(asc(mealIngredients.sortOrder), asc(mealIngredients.id))

  const multiplier = input.mealQuantity && input.mealQuantity > 0 ? input.mealQuantity : 1

  const values = rows
    .filter(({ food }) => food.userId === userId)
    .map(({ ingredient, food }) => {
      const mode = (ingredient.mode === "weight" ? "weight" : "serving") as IngredientMode
      const servings =
        ingredientServings({ amount: num0(ingredient.amount), mode, servingSize: food.servingSize }) * multiplier
      return {
        userId,
        entryDate: input.dateKey,
        mealGroupId: input.mealGroupId,
        mealGroupName: input.mealGroupName,
        foodId: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        quantity: toNumeric(servings) ?? "0",
      }
    })

  if (values.length > 0) await db.insert(entries).values(values)
  revalidatePath("/")
}

// Add a one-off entry typed in directly.
export async function addQuickEntry(input: {
  dateKey: string
  mealGroupId: number
  mealGroupName: string
  name: string
  calories: number
  protein: number
  carbs?: number | null
  fat?: number | null
  quantity: number
  servingSize?: string | null
}) {
  const userId = await requireUserId()
  await requireOwnedMealGroup(userId, input.mealGroupId)
  await db.insert(entries).values({
    userId,
    entryDate: input.dateKey,
    mealGroupId: input.mealGroupId,
    mealGroupName: input.mealGroupName,
    foodId: null,
    name: input.name.trim(),
    servingSize: input.servingSize?.trim() || null,
    calories: toNumeric(input.calories) ?? "0",
    protein: toNumeric(input.protein) ?? "0",
    carbs: toNumeric(input.carbs),
    fat: toNumeric(input.fat),
    quantity: toNumeric(input.quantity) ?? "1",
  })
  revalidatePath("/")
}

export async function updateEntryQuantity(id: number, quantity: number) {
  const userId = await requireUserId()
  await db
    .update(entries)
    .set({ quantity: toNumeric(quantity) ?? "1" })
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
  revalidatePath("/")
}

export async function moveEntry(id: number, mealGroupId: number, mealGroupName: string) {
  const userId = await requireUserId()
  await requireOwnedMealGroup(userId, mealGroupId)
  await db
    .update(entries)
    .set({ mealGroupId, mealGroupName })
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
  revalidatePath("/")
}

export async function updateEntry(id: number, input: {
  foodId: number
  quantity: number
}) {
  const userId = await requireUserId()
  const food = await requireOwnedFood(userId, input.foodId)

  await db
    .update(entries)
    .set({
      foodId: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      quantity: toNumeric(input.quantity) ?? "1",
    })
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
  revalidatePath("/")
}

// Update a one-off (custom) entry — the fields typed in directly, no linked food.
export async function updateQuickEntry(id: number, input: {
  name: string
  calories: number
  protein: number
  carbs?: number | null
  fat?: number | null
  quantity: number
  servingSize?: string | null
}) {
  const userId = await requireUserId()
  await db
    .update(entries)
    .set({
      foodId: null,
      name: input.name.trim(),
      servingSize: input.servingSize?.trim() || null,
      calories: toNumeric(input.calories) ?? "0",
      protein: toNumeric(input.protein) ?? "0",
      carbs: toNumeric(input.carbs),
      fat: toNumeric(input.fat),
      quantity: toNumeric(input.quantity) ?? "1",
    })
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
  revalidatePath("/")
}

export async function deleteEntry(id: number) {
  const userId = await requireUserId()
  await db.delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)))
  revalidatePath("/")
}

// Whether a single day is marked as skipped (excluded from weekly totals).
export async function isDaySkipped(dateKey: string): Promise<boolean> {
  const userId = await requireUserId()
  const [row] = await db
    .select({ entryDate: skippedDays.entryDate })
    .from(skippedDays)
    .where(and(eq(skippedDays.userId, userId), eq(skippedDays.entryDate, dateKey)))
    .limit(1)
  return !!row
}

// Return the set of skipped dates within an inclusive range.
export async function getSkippedDaysInRange(startKey: string, endKey: string): Promise<string[]> {
  const userId = await requireUserId()
  const rows = await db
    .select({ entryDate: skippedDays.entryDate })
    .from(skippedDays)
    .where(
      and(eq(skippedDays.userId, userId), gte(skippedDays.entryDate, startKey), lte(skippedDays.entryDate, endKey)),
    )
  return rows.map((r) => r.entryDate)
}

// Toggle a day's skipped state. Skipping does NOT delete any food entries — it
// only excludes the day from weekly totals until it's included again.
export async function setDaySkipped(dateKey: string, skipped: boolean) {
  const userId = await requireUserId()
  if (skipped) {
    await db.insert(skippedDays).values({ userId, entryDate: dateKey }).onConflictDoNothing()
  } else {
    await db
      .delete(skippedDays)
      .where(and(eq(skippedDays.userId, userId), eq(skippedDays.entryDate, dateKey)))
  }
  revalidatePath("/")
  revalidatePath("/week")
}
