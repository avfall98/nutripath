import { ProfileForm } from "@/components/profile/profile-form"
import { MealGroupsManager } from "@/components/meals/meal-groups-manager"
import { getProfile } from "@/app/actions/profile"
import { getMealGroups } from "@/app/actions/meal-groups"

export default async function ProfilePage() {
  const [profile, groups] = await Promise.all([getProfile(), getMealGroups()])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-[21px] font-bold tracking-tight text-balance">Profile &amp; goals</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself and set the daily targets you want to hit.
        </p>
      </header>

      <ProfileForm profile={profile} />

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Meal groups</h2>
          <p className="text-sm text-muted-foreground">
            Customize how your day is divided. Reorder, rename, or add your own.
          </p>
        </div>
        <MealGroupsManager initialGroups={groups} />
      </section>
    </main>
  )
}
