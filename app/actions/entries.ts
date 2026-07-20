"use server"

import { db } from "@/lib/db"
import { entries, foods } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { num, num0, toNumeric } from "@/lib/format"
import type { EntryDTO } from "@/lib/types"

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
  }
}

export async function getEntriesByDate(dateKey: string): Promise<EntryDTO[]> {
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.entryDate, dateKey))
    .orderBy(asc(entries.createdAt))
  return rows.map(serialize)
}

// Add an entry from an existing reusable food.
export async function addEntryFromFood(input: {
  dateKey: string
  foodId: number
  mealGroupId: number
  mealGroupName: string
  quantity: number
}) {
  const [food] = await db.select().from(foods).where(eq(foods.id, input.foodId)).limit(1)
  if (!food) throw new Error("Food not found")
  await db.insert(entries).values({
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
}) {
  await db.insert(entries).values({
    entryDate: input.dateKey,
    mealGroupId: input.mealGroupId,
    mealGroupName: input.mealGroupName,
    foodId: null,
    name: input.name.trim(),
    calories: toNumeric(input.calories) ?? "0",
    protein: toNumeric(input.protein) ?? "0",
    carbs: toNumeric(input.carbs),
    fat: toNumeric(input.fat),
    quantity: toNumeric(input.quantity) ?? "1",
  })
  revalidatePath("/")
}

export async function updateEntryQuantity(id: number, quantity: number) {
  await db
    .update(entries)
    .set({ quantity: toNumeric(quantity) ?? "1" })
    .where(eq(entries.id, id))
  revalidatePath("/")
}

export async function moveEntry(id: number, mealGroupId: number, mealGroupName: string) {
  await db
    .update(entries)
    .set({ mealGroupId, mealGroupName })
    .where(eq(entries.id, id))
  revalidatePath("/")
}

export async function updateEntry(id: number, input: {
  foodId: number
  quantity: number
}) {
  const [food] = await db.select().from(foods).where(eq(foods.id, input.foodId)).limit(1)
  if (!food) throw new Error("Food not found")
  
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
    .where(eq(entries.id, id))
  revalidatePath("/")
}

export async function deleteEntry(id: number) {
  await db.delete(entries).where(eq(entries.id, id))
  revalidatePath("/")
}
