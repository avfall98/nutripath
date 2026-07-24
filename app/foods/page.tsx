import { FoodLibrary } from "@/components/foods/food-library"
import { getFoods } from "@/app/actions/foods"
import { getProfile } from "@/app/actions/profile"

export default async function FoodsPage() {
  const [foods, profile] = await Promise.all([getFoods(), getProfile()])

  return (
    <div className="min-h-svh">
      <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
        <FoodLibrary foods={foods} profile={profile} />
      </main>
    </div>
  )
}
