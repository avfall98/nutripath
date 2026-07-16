"use server"

import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { num, toNumeric } from "@/lib/format"
import type { ProfileDTO } from "@/lib/types"

export async function getProfile(): Promise<ProfileDTO | null> {
  const rows = await db.select().from(profile).where(eq(profile.id, 1)).limit(1)
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
  const values = {
    id: 1,
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

  await db
    .insert(profile)
    .values(values)
    .onConflictDoUpdate({
      target: profile.id,
      set: {
        age: values.age,
        sex: values.sex,
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        targetWeightKg: values.targetWeightKg,
        targetCalories: values.targetCalories,
        targetProtein: values.targetProtein,
        activityLevel: values.activityLevel,
        updatedAt: values.updatedAt,
      },
    })

  revalidatePath("/")
  revalidatePath("/profile")
}
