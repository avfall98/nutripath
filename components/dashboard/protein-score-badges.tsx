import { proteinCaloriePct, proteinPer100Cal, type ProteinScore } from "@/lib/nutrition"
import { round } from "@/lib/format"

function getCombinedGrade(p100: ProteinScore, pCal: ProteinScore): ProteinScore["grade"] {
  if (p100.grade === null || pCal.grade === null) return null
  // Use the lower of the two grades for a conservative combined score
  const gradeOrder = { A: 0, B: 1, C: 2, D: 3, F: 4 } as const
  const p100Order = gradeOrder[p100.grade]
  const pCalOrder = gradeOrder[pCal.grade]
  const grades: Array<ProteinScore["grade"]> = ["A", "B", "C", "D", "F"]
  return grades[Math.max(p100Order, pCalOrder)]
}

function getGradeColor(grade: ProteinScore["grade"]): string {
  const GRADE_COLORS: Record<NonNullable<ProteinScore["grade"]>, string> = {
    A: "#10B981",
    B: "#84CC16",
    C: "#F59E0B",
    D: "#F97316",
    F: "#EF4444",
  }
  return grade ? GRADE_COLORS[grade] : "#94A3B8"
}

// proteinG in grams, kcal in kilocalories.
export function ProteinScoreBadges({ proteinG, kcal }: { proteinG: number; kcal: number }) {
  const p100 = proteinPer100Cal(proteinG, kcal)
  const pCal = proteinCaloriePct(proteinG, kcal)
  
  const combinedGrade = getCombinedGrade(p100, pCal)
  const isNa = combinedGrade === null
  const color = getGradeColor(combinedGrade)
  
  const text = isNa 
    ? "N/A" 
    : `${combinedGrade} • ${round(p100.value ?? 0, 1)}g / 100kcal - ${round(pCal.value ?? 0, 1)}%`
  
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span
        className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums"
        style={{ color, borderColor: color, backgroundColor: `${color}1a` }}
        title="Protein Score: per 100kcal and calorie percentage"
        aria-label={`Protein Score: ${text}`}
      >
        {text}
      </span>
    </div>
  )
}
