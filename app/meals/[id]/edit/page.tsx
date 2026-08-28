import { notFound } from "next/navigation"
import { MealBuilder } from "@/components/meals/meal-builder"
import { getMealById } from "@/app/actions/meals"
import { getFoods } from "@/app/actions/foods"
import { getProfile } from "@/app/actions/profile"

export const dynamic = "force-dynamic"

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mealId = Number(id)
  if (!Number.isFinite(mealId)) notFound()

  const [meal, foods, profile] = await Promise.all([getMealById(mealId), getFoods(), getProfile()])
  if (!meal) notFound()

  return <MealBuilder meal={meal} foods={foods} profile={profile} />
}
