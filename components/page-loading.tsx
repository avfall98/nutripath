import { Loader2 } from "lucide-react"

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60svh] w-full flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="size-8 animate-spin text-foreground" />
      <p className="text-sm font-medium">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  )
}
