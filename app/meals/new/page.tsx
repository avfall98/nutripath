import { MealBuilder } from "@/components/meals/meal-builder"
import { getFoods } from "@/app/actions/foods"
import { getProfile } from "@/app/actions/profile"

export const dynamic = "force-dynamic"

export default async function NewMealPage() {
  const [foods, profile] = await Promise.all([getFoods(), getProfile()])
  return <MealBuilder meal={null} foods={foods} profile={profile} />
}
