"use server"

import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { num, toNumeric } from "@/lib/format"
import type { ProfileDTO } from "@/lib/types"
import { requireUserId } from "@/lib/session"

export async function getProfile(): Promise<ProfileDTO | null> {
  const userId = await requireUserId()
  const rows = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1)
  const p = rows[0]
  if (!p) return null
  return {
    age: p.age,
    sex: p.sex,
    heightCm: num(p.heightCm),
    weightKg: num(p.weightKg),
    targetWeightKg: num(p.targetWeightKg),
    targetCalories: p.targetCalories,
    targetProtein: p.targetProtein,
    activityLevel: p.activityLevel,
  }
}

export type SaveProfileInput = {
  age?: number | null
  sex?: string | null
  heightCm?: number | null
  weightKg?: number | null
  targetWeightKg?: number | null
  targetCalories?: number | null
  targetProtein?: number | null
  activityLevel?: string | null
}

export async function saveProfile(input: SaveProfileInput) {
  const userId = await requireUserId()

  const values = {
    age: input.age ?? null,
    sex: input.sex ?? null,
    heightCm: toNumeric(input.heightCm),
    weightKg: toNumeric(input.weightKg),
    targetWeightKg: toNumeric(input.targetWeightKg),
    targetCalories: input.targetCalories ?? null,
    targetProtein: input.targetProtein ?? null,
    activityLevel: input.activityLevel ?? null,
    updatedAt: new Date(),
  }

  // Manual upsert scoped to the current user. Avoids depending on a unique
  // constraint that only exists after migration 2, and never trusts a client id.
  const updated = await db
    .update(profile)
    .set(values)
    .where(eq(profile.userId, userId))
    .returning({ userId: profile.userId })

  if (updated.length === 0) {
    await db.insert(profile).values({ userId, ...values })
  }

  revalidatePath("/")
  revalidatePath("/profile")
}
