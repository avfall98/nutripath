import { PageLoading } from "@/components/page-loading"

export default function Loading() {
  return (
    <div className="min-h-svh">
      <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
        <PageLoading />
      </main>
    </div>
  )
}
