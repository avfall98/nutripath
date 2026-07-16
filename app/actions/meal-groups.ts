"use server"

import { db } from "@/lib/db"
import { mealGroups, entries } from "@/lib/db/schema"
import { asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { MealGroupDTO } from "@/lib/types"

export async function getMealGroups(): Promise<MealGroupDTO[]> {
  const rows = await db
    .select()
    .from(mealGroups)
    .orderBy(asc(mealGroups.sortOrder), asc(mealGroups.id))
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder }))
}

export async function createMealGroup(name: string) {
  const clean = name.trim()
  if (!clean) return
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${mealGroups.sortOrder}), -1)` })
    .from(mealGroups)
  await db.insert(mealGroups).values({ name: clean, sortOrder: (max ?? -1) + 1 })
  revalidatePath("/")
  revalidatePath("/meals")
}

export async function renameMealGroup(id: number, name: string) {
  const clean = name.trim()
  if (!clean) return
  await db.update(mealGroups).set({ name: clean }).where(eq(mealGroups.id, id))
  revalidatePath("/")
  revalidatePath("/meals")
}

export async function deleteMealGroup(id: number) {
  await db.delete(mealGroups).where(eq(mealGroups.id, id))
  // Detach existing entries so historical logs remain intact.
  await db.update(entries).set({ mealGroupId: null }).where(eq(entries.mealGroupId, id))
  revalidatePath("/")
  revalidatePath("/meals")
}

export async function reorderMealGroups(orderedIds: number[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(mealGroups).set({ sortOrder: index }).where(eq(mealGroups.id, id)),
    ),
  )
  revalidatePath("/")
  revalidatePath("/meals")
}
