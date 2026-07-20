import { calorieDensity, parseServingWeight } from "@/lib/nutrition"
import { round } from "@/lib/format"

// kcal: energy in kilocalories. servingSize: string like "100g" or "250ml".
export function CalorieDensityBadge({
  kcal,
  servingSize,
  fontSize = "text-[11px]",
}: {
  kcal: number
  servingSize: string | null
  fontSize?: string
}) {
  const density = calorieDensity(kcal, parseServingWeight(servingSize))
  const isNa = density.grade === null

  const text = isNa
    ? "N/A"
    : `${density.grade} • ${round(density.value ?? 0, 0)} kcal / 100g`

  const title = isNa
    ? "Calorie Density: serving weight unavailable"
    : `Calorie Density: ${density.grade} • ${density.label}`

  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 ${fontSize} font-semibold leading-none tabular-nums`}
      style={{ color: density.color, borderColor: density.color, backgroundColor: `${density.color}1a` }}
      title={title}
      aria-label={title}
    >
      {text}
    </span>
  )
}
