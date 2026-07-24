import { ProfileForm } from "@/components/profile/profile-form"
import { MealGroupsManager } from "@/components/meals/meal-groups-manager"
import { getProfile } from "@/app/actions/profile"
import { getMealGroups } from "@/app/actions/meal-groups"

export default async function ProfilePage() {
  const [profile, groups] = await Promise.all([getProfile(), getMealGroups()])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance">Profile &amp; goals</h1>
        <p className="text-sm text-muted-foreground">
          Your details, daily targets, and how your day is divided into meals.
        </p>
      </header>

      <ProfileForm profile={profile}>
        <MealGroupsManager initialGroups={groups} />
      </ProfileForm>
    </main>
  )
}
