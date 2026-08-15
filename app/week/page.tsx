import { Suspense } from "react"
import { WeekView } from "@/components/week/week-view"
import { getProfile } from "@/app/actions/profile"
import { PageLoading } from "@/components/page-loading"

export default async function WeekPage() {
  const profile = await getProfile()

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <Suspense fallback={<PageLoading label="Loading your week…" />}>
        <WeekView profile={profile} />
      </Suspense>
    </main>
  )
}
