import { calorieDensity, parseServingWeight } from "@/lib/nutrition"
import { round } from "@/lib/format"
import { ScorePill } from "@/components/dashboard/protein-score-badges"

// kcal: energy in kilocalories. servingSize: string like "100g" or "250ml".
export function CalorieDensityBadge({
  kcal,
  servingSize,
  size = "sm",
}: {
  kcal: number
  servingSize: string | null
  fontSize?: string
  size?: "sm" | "lg"
}) {
  const density = calorieDensity(kcal, parseServingWeight(servingSize))
  const value = density.value != null ? String(round(density.value, 0)) : null
  return (
    <ScorePill
      kind="density"
      grade={density.grade}
      value={value}
      title={density.grade ? `Calorie density: ${density.grade} · ${density.label}` : "Calorie density: unavailable"}
      ariaLabel={
        density.grade
          ? `Calorie density: grade ${density.grade}, ${value} kcal per 100g`
          : "Calorie density: not available"
      }
      size={size}
    />
  )
}
