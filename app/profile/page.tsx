import { ProfileForm } from "@/components/profile/profile-form"
import { getProfile } from "@/app/actions/profile"

export default async function ProfilePage() {
  const profile = await getProfile()

  return (
    <div className="min-h-svh">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Profile & goals</h1>
          <p className="mt-1 text-muted-foreground">
            Tell us about yourself and set the daily targets you want to hit.
          </p>
        </div>
        <ProfileForm profile={profile} />
      </main>
    </div>
  )
}
