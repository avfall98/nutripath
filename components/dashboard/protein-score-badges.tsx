import { proteinPer100Cal } from "@/lib/nutrition"
import { round } from "@/lib/format"

type Tier = {
  label: string
  className: string
}

// Tier the food based on Protein per 100 Calories.
function getTier(value: number): Tier {
  if (value >= 10) {
    return {
      label: "Elite",
      className: "bg-green-100 text-green-800",
    }
  }
  if (value >= 8) {
    return {
      label: "Target",
      className: "bg-yellow-100 text-yellow-800",
    }
  }
  return {
    label: "Poor",
    className: "bg-red-100 text-red-800",
  }
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

  if (p100.value == null) {
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
  const tier = getTier(p100.value)

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${tier.className}`}
        title="Protein Score: protein per 100 kcal"
        aria-label={`Protein Score: ${value.toFixed(1)} ${tier.label}`}
      >
        {value.toFixed(1)} {tier.label}
      </span>
    </div>
  )
}
