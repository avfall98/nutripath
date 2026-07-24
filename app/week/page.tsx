import { WeekView } from "@/components/week/week-view"
import { getProfile } from "@/app/actions/profile"

export default async function WeekPage() {
  const profile = await getProfile()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
      <WeekView profile={profile} />
    </main>
  )
}
