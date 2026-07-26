import { ProfileForm } from "@/components/profile/profile-form"
import { MealGroupsManager } from "@/components/meals/meal-groups-manager"
import { InstallAppButton } from "@/components/pwa/install-app"
import { Card } from "@/components/ui/card"
import { getProfile } from "@/app/actions/profile"
import { getMealGroups } from "@/app/actions/meal-groups"

export default async function ProfilePage() {
  const [profile, groups] = await Promise.all([getProfile(), getMealGroups()])

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-6 md:px-8 md:pt-8">
      {/* Mobile header */}
      <header className="mb-6 md:hidden">
        <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance">Profile &amp; goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details, daily targets, and meal groups.
        </p>
      </header>

      {/* Desktop header */}
      <header className="mb-8 hidden flex-col md:flex">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">Profile</p>
        <h1 className="mt-0.5 text-[42px] font-extrabold leading-none tracking-[-1px] text-balance">
          Profile &amp; goals
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Your details, daily targets, and meal groups</p>
      </header>

      <ProfileForm profile={profile}>
        <MealGroupsManager initialGroups={groups} />
      </ProfileForm>

      <Card className="mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 className="text-xl font-bold">Install NutriTrack</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add NutriTrack to your device for a full-screen, app-like experience.
          </p>
        </div>
        <InstallAppButton className="self-start sm:self-auto" />
      </Card>
    </main>
  )
}
