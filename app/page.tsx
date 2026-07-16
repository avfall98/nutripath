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
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance">Today&apos;s Nutrition</h1>
        <p className="text-sm text-muted-foreground">
          Log your meals and track progress toward your goals.
        </p>
      </header>
      <Dashboard profile={profile} mealGroups={mealGroups} foods={foods} />
    </main>
  )
}
