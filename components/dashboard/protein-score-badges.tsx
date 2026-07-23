import { proteinPer100Cal, type ProteinGrade } from "@/lib/nutrition"
import { round } from "@/lib/format"

// Soft Pill styling for each 5-level grade: soft (low opacity) background, high-contrast text.
export const GRADE_PILL_CLASSES: Record<ProteinGrade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
}

// proteinG in grams, kcal in kilocalories.
export function ProteinScoreBadges({
  proteinG,
  kcal,
}: {
  proteinG: number
  kcal: number
  // Accepted for backwards compatibility with existing call sites; no longer used.
  fontSize?: string
}) {
  const p100 = proteinPer100Cal(proteinG, kcal)

  if (p100.value == null || p100.grade == null) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground tabular-nums"
          title="Protein Score: protein per 100 kcal"
          aria-label="Protein Score: not available"
        >
          N/A
        </span>
      </div>
    )
  }

  const value = round(p100.value, 1)

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${GRADE_PILL_CLASSES[p100.grade]}`}
        title="Protein Score: protein per 100 kcal"
        aria-label={`Protein Score: ${value.toFixed(1)} grade ${p100.grade}`}
      >
        {value.toFixed(1)} {p100.grade}
      </span>
    </div>
  )
}
