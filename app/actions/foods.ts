"use server"

import { db } from "@/lib/db"
import { foods } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"
import { num, num0, toNumeric } from "@/lib/format"
import type { FoodDTO } from "@/lib/types"

function serialize(r: typeof foods.$inferSelect): FoodDTO {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    servingSize: r.servingSize,
    calories: num0(r.calories),
    protein: num0(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    imageUrl: r.imageUrl,
    infoUrl: r.infoUrl,
  }
}

export async function getFoods(): Promise<FoodDTO[]> {
  const rows = await db.select().from(foods).orderBy(asc(foods.name))
  return rows.map(serialize)
}

export type FoodInput = {
  name: string
  brand?: string | null
  servingSize?: string | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  imageUrl?: string | null
  infoUrl?: string | null
}

export async function createFood(input: FoodInput): Promise<FoodDTO> {
  const [row] = await db
    .insert(foods)
    .values({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      servingSize: input.servingSize?.trim() || null,
      calories: toNumeric(input.calories) ?? "0",
      protein: toNumeric(input.protein) ?? "0",
      carbs: toNumeric(input.carbs),
      fat: toNumeric(input.fat),
      imageUrl: input.imageUrl || null,
      infoUrl: input.infoUrl?.trim() || null,
    })
    .returning()
  revalidatePath("/foods")
  revalidatePath("/")
  return serialize(row)
}

export async function updateFood(id: number, input: FoodInput) {
  await db
    .update(foods)
    .set({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      servingSize: input.servingSize?.trim() || null,
      calories: toNumeric(input.calories) ?? "0",
      protein: toNumeric(input.protein) ?? "0",
      carbs: toNumeric(input.carbs),
      fat: toNumeric(input.fat),
      imageUrl: input.imageUrl || null,
      infoUrl: input.infoUrl?.trim() || null,
    })
    .where(eq(foods.id, id))
  revalidatePath("/foods")
  revalidatePath("/")
}

export async function deleteFood(id: number) {
  await db.delete(foods).where(eq(foods.id, id))
  revalidatePath("/foods")
  revalidatePath("/")
}

export async function uploadFoodImage(formData: FormData): Promise<{ url: string }> {
  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file provided")
  const blob = await put(`foods/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  })
  return { url: blob.url }
}
