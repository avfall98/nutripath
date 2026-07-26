import { Dna, Flame } from "lucide-react"
import { proteinPer100Cal, type ProteinGrade } from "@/lib/nutrition"
import { round } from "@/lib/format"
import { cn } from "@/lib/utils"

// 5-step grade scale — translucent background + colored text (see DESIGN-SPEC.md).
export const GRADE_STYLES: Record<ProteinGrade, { backgroundColor: string; color: string }> = {
  A: { backgroundColor: "rgba(74,222,128,.16)", color: "#4ade80" },
  B: { backgroundColor: "rgba(163,230,53,.12)", color: "#a3e635" },
  C: { backgroundColor: "rgba(250,204,21,.12)", color: "#facc15" },
  D: { backgroundColor: "rgba(251,146,60,.12)", color: "#fb923c" },
  F: { backgroundColor: "rgba(244,63,94,.14)", color: "#fb7185" },
}

type PillKind = "protein" | "density"

export function ScorePill({
  kind,
  grade,
  value,
  title,
  ariaLabel,
  size = "sm",
}: {
  kind: PillKind
  grade: ProteinGrade | null
  value: string | null
  title?: string
  ariaLabel?: string
  size?: "sm" | "lg"
}) {
  const sizeClasses = size === "lg" ? "min-w-16 px-3 py-1.5 text-[13px]" : "min-w-14 px-2 py-1 text-[10.5px]"

  if (grade == null || value == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-muted font-semibold tabular-nums text-muted-foreground",
          sizeClasses,
        )}
        title={title}
        aria-label={ariaLabel}
      >
        {kind === "protein" ? (
          <Dna className={cn("shrink-0", size === "lg" ? "size-4" : "size-3")} aria-hidden="true" />
        ) : (
          <Flame className={cn("shrink-0", size === "lg" ? "size-4" : "size-3")} aria-hidden="true" />
        )}
        N/A
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold tabular-nums",
        sizeClasses,
      )}
      style={GRADE_STYLES[grade]}
      title={title}
      aria-label={ariaLabel}
    >
      {kind === "protein" ? (
        <Dna className={cn("shrink-0", size === "lg" ? "size-4" : "size-3")} style={{ color: GRADE_STYLES[grade].color }} aria-hidden="true" />
      ) : (
        <Flame className={cn("shrink-0", size === "lg" ? "size-4" : "size-3")} style={{ color: GRADE_STYLES[grade].color }} aria-hidden="true" />
      )}
      {grade} · {value}
    </span>
  )
}

// proteinG in grams, kcal in kilocalories.
export function ProteinScoreBadges({ proteinG, kcal, size = "sm" }: { proteinG: number; kcal: number; fontSize?: string; size?: "sm" | "lg" }) {
  const p100 = proteinPer100Cal(proteinG, kcal)
  const value = p100.value != null ? round(p100.value, 1).toFixed(1) : null
  return (
    <ScorePill
      kind="protein"
      grade={p100.grade}
      value={value}
      title="Protein score: protein per 100 kcal"
      ariaLabel={
        p100.grade ? `Protein score: grade ${p100.grade}, ${value}` : "Protein score: not available"
      }
      size={size}
    />
  )
}
