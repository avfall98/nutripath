import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GRADE_STYLES } from "@/components/dashboard/protein-score-badges"
import type { ProteinGrade } from "@/lib/nutrition"

const PROTEIN_ROWS: { grade: ProteinGrade; range: string; meaning: string }[] = [
  { grade: "A", range: "10g+ per 100 kcal", meaning: "Excellent — very protein-dense" },
  { grade: "B", range: "8–10g per 100 kcal", meaning: "Good — solid protein source" },
  { grade: "C", range: "6–8g per 100 kcal", meaning: "Fair — moderate protein" },
  { grade: "D", range: "4–6g per 100 kcal", meaning: "Low — light on protein" },
  { grade: "F", range: "Under 4g per 100 kcal", meaning: "Poor — minimal protein" },
]

const DENSITY_ROWS: { grade: ProteinGrade; range: string; meaning: string }[] = [
  { grade: "A", range: "Under 70 kcal per 100g", meaning: "Low density — very filling for the calories" },
  { grade: "B", range: "70–150 kcal per 100g", meaning: "Moderate density" },
  { grade: "C", range: "150–250 kcal per 100g", meaning: "Medium density" },
  { grade: "D", range: "250–400 kcal per 100g", meaning: "High density" },
  { grade: "F", range: "Over 400 kcal per 100g", meaning: "Very high density — easy to overeat calories" },
]

function GradeChip({ grade }: { grade: ProteinGrade }) {
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
      style={GRADE_STYLES[grade]}
      aria-hidden="true"
    >
      {grade}
    </span>
  )
}

function ScoreTable({ rows }: { rows: { grade: ProteinGrade; range: string; meaning: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.grade} className="flex items-center gap-3 rounded-md bg-inset px-3 py-2.5">
          <GradeChip grade={row.grade} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold tabular-nums text-foreground">{row.range}</span>
            <span className="text-xs text-muted-foreground">{row.meaning}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScoreExplainer() {
  return (
    <Card className="mt-5 border-0 bg-transparent p-0 sm:border sm:bg-card sm:p-7">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold">Understanding your scores</CardTitle>
        <CardDescription>How the calorie and protein grades on your dashboard are calculated.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-0">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Protein score</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Measures how much protein a food delivers relative to its energy, calculated as grams of protein per
              100 kilocalories. A higher grade means more protein per calorie — useful for hitting your protein
              target without overshooting your calorie budget.
            </p>
          </div>
          <ScoreTable rows={PROTEIN_ROWS} />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Calorie score</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Measures how energy-dense a food is, calculated as kilocalories per 100g (or 100ml) of serving. A
              lower grade means fewer calories for the same amount of food — helpful for staying full while managing
              your calorie target.
            </p>
          </div>
          <ScoreTable rows={DENSITY_ROWS} />
        </div>

        <p className="text-xs text-faint">
          Scores are shown as N/A when a food is missing the serving size or nutrition data needed to calculate
          them.
        </p>
      </CardContent>
    </Card>
  )
}
