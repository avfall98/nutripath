import { getProfile } from "@/app/actions/profile"
import { getMealGroups } from "@/app/actions/meal-groups"
import { getFoods } from "@/app/actions/foods"
import { Dashboard } from "@/components/dashboard/dashboard"

export default async function HomePage() {
  const [profile, mealGroups, foods] = await Promise.all([
    getProfile(),
    getMealGroups(),
    getFoods(),
  ])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      <Dashboard profile={profile} mealGroups={mealGroups} foods={foods} />
    </main>
  )
}
