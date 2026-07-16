import { getMealGroups } from "@/app/actions/meal-groups"
import { MealGroupsManager } from "@/components/meals/meal-groups-manager"

export default async function MealsPage() {
  const groups = await getMealGroups()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance">Meal Groups</h1>
        <p className="text-sm text-muted-foreground">
          Customize how your day is divided. Reorder, rename, or add your own.
        </p>
      </header>
      <MealGroupsManager initialGroups={groups} />
    </main>
  )
}
