import { proteinCaloriePct, proteinPer100Cal, type ProteinScore } from "@/lib/nutrition"
import { round } from "@/lib/format"

function ScoreBadge({ score, unit, label }: { score: ProteinScore; unit: string; label: string }) {
  const isNa = score.grade === null
  const text = isNa ? "N/A" : `${score.grade} • ${round(score.value ?? 0, 1)}${unit}`
  return (
    <span
      className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums"
      style={{ color: score.color, borderColor: score.color, backgroundColor: `${score.color}1a` }}
      title={label}
      aria-label={`${label}: ${text}`}
    >
      {text}
    </span>
  )
}

// proteinG in grams, kcal in kilocalories.
export function ProteinScoreBadges({ proteinG, kcal }: { proteinG: number; kcal: number }) {
  const p100 = proteinPer100Cal(proteinG, kcal)
  const pCal = proteinCaloriePct(proteinG, kcal)
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <ScoreBadge score={p100} unit="g / 100kcal" label="Protein per 100 kcal" />
      <ScoreBadge score={pCal} unit="%" label="Protein calorie percentage" />
    </div>
  )
}
