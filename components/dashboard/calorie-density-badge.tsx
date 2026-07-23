import { calorieDensity, parseServingWeight } from "@/lib/nutrition"
import { round } from "@/lib/format"
import { GRADE_PILL_CLASSES } from "@/components/dashboard/protein-score-badges"

// kcal: energy in kilocalories. servingSize: string like "100g" or "250ml".
export function CalorieDensityBadge({
  kcal,
  servingSize,
}: {
  kcal: number
  servingSize: string | null
  // Accepted for backwards compatibility with existing call sites; no longer used.
  fontSize?: string
}) {
  const density = calorieDensity(kcal, parseServingWeight(servingSize))

  if (density.grade == null || density.value == null) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground tabular-nums"
          title="Calorie Density: serving weight unavailable"
          aria-label="Calorie Density: not available"
        >
          N/A
        </span>
      </div>
    )
  }

  const value = round(density.value, 0)

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${GRADE_PILL_CLASSES[density.grade]}`}
        title={`Calorie Density: ${density.grade} • ${density.label}`}
        aria-label={`Calorie Density: grade ${density.grade}, ${value} kcal per 100g`}
      >
        {density.grade} - {value}
      </span>
    </div>
  )
}
