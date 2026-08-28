import { MealsLibrary } from "@/components/meals/meals-library"
import { getMeals } from "@/app/actions/meals"
import { getProfile } from "@/app/actions/profile"

export default async function MealsPage() {
  const [meals, profile] = await Promise.all([getMeals(), getProfile()])

  return (
    <div className="min-h-svh">
      <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
        <MealsLibrary meals={meals} profile={profile} />
      </main>
    </div>
  )
}
