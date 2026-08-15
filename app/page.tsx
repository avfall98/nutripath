import { Suspense } from "react"
import { getProfile } from "@/app/actions/profile"
import { getMealGroups } from "@/app/actions/meal-groups"
import { getFoods } from "@/app/actions/foods"
import { Dashboard } from "@/components/dashboard/dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default async function HomePage() {
  const [profile, mealGroups, foods] = await Promise.all([
    getProfile(),
    getMealGroups(),
    getFoods(),
  ])

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <Suspense fallback={<Skeleton className="h-16 w-full rounded-xl" />}>
        <Dashboard profile={profile} mealGroups={mealGroups} foods={foods} />
      </Suspense>
    </main>
  )
}
