import { ProfileForm } from "@/components/profile/profile-form"
import { MealGroupsManager } from "@/components/meals/meal-groups-manager"
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

      {/* Desktop header with avatar */}
      <header className="mb-8 hidden items-center gap-5 md:flex">
        <div
          className="flex size-[92px] shrink-0 items-center justify-center rounded-full text-4xl font-extrabold text-primary-foreground"
          style={{ background: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)" }}
          aria-hidden="true"
        >
          A
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">Profile</p>
          <h1 className="mt-0.5 text-[42px] font-extrabold leading-none tracking-[-1px] text-balance">
            Profile &amp; goals
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Your details, daily targets, and meal groups</p>
        </div>
      </header>

      <ProfileForm profile={profile}>
        <MealGroupsManager initialGroups={groups} />
      </ProfileForm>
    </main>
  )
}
