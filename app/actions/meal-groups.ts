"use server"

import { db } from "@/lib/db"
import { mealGroups, entries } from "@/lib/db/schema"
import { and, asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { MealGroupDTO } from "@/lib/types"
import { requireUserId } from "@/lib/session"

export async function getMealGroups(): Promise<MealGroupDTO[]> {
  const userId = await requireUserId()
  const rows = await db
    .select()
    .from(mealGroups)
    .where(eq(mealGroups.userId, userId))
    .orderBy(asc(mealGroups.sortOrder), asc(mealGroups.id))
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder }))
}

export async function createMealGroup(name: string) {
  const userId = await requireUserId()
  const clean = name.trim()
  if (!clean) return
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${mealGroups.sortOrder}), -1)` })
    .from(mealGroups)
    .where(eq(mealGroups.userId, userId))
  await db.insert(mealGroups).values({ userId, name: clean, sortOrder: (max ?? -1) + 1 })
  revalidatePath("/")
  revalidatePath("/profile")
}

export async function renameMealGroup(id: number, name: string) {
  const userId = await requireUserId()
  const clean = name.trim()
  if (!clean) return
  await db
    .update(mealGroups)
    .set({ name: clean })
    .where(and(eq(mealGroups.id, id), eq(mealGroups.userId, userId)))
  revalidatePath("/")
  revalidatePath("/profile")
}

export async function deleteMealGroup(id: number) {
  const userId = await requireUserId()
  // Only delete if the group belongs to the current user.
  await db.delete(mealGroups).where(and(eq(mealGroups.id, id), eq(mealGroups.userId, userId)))
  // Detach the current user's entries so historical logs remain intact.
  await db
    .update(entries)
    .set({ mealGroupId: null })
    .where(and(eq(entries.mealGroupId, id), eq(entries.userId, userId)))
  revalidatePath("/")
  revalidatePath("/profile")
}

export async function reorderMealGroups(orderedIds: number[]) {
  const userId = await requireUserId()
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(mealGroups)
        .set({ sortOrder: index })
        .where(and(eq(mealGroups.id, id), eq(mealGroups.userId, userId))),
    ),
  )
  revalidatePath("/")
  revalidatePath("/profile")
}
