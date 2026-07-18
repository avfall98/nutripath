import { FoodLibrary } from "@/components/foods/food-library"
import { getFoods } from "@/app/actions/foods"
import { getProfile } from "@/app/actions/profile"

export default async function FoodsPage() {
  const [foods, profile] = await Promise.all([getFoods(), getProfile()])

  return (
    <div className="min-h-svh">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Food library</h1>
          <p className="mt-1 text-muted-foreground">
            Reusable foods with nutrition, photos, and links you can log any day.
          </p>
        </div>
        <FoodLibrary foods={foods} profile={profile} />
      </main>
    </div>
  )
}
