import { Flame } from "lucide-react"
import { proteinPer100Cal, type ProteinGrade } from "@/lib/nutrition"
import { round } from "@/lib/format"

// 5-step grade scale — translucent background + colored text (see DESIGN-SPEC.md).
export const GRADE_STYLES: Record<ProteinGrade, { backgroundColor: string; color: string }> = {
  A: { backgroundColor: "rgba(74,222,128,.16)", color: "#4ade80" },
  B: { backgroundColor: "rgba(163,230,53,.12)", color: "#a3e635" },
  C: { backgroundColor: "rgba(250,204,21,.12)", color: "#facc15" },
  D: { backgroundColor: "rgba(251,146,60,.12)", color: "#fb923c" },
  F: { backgroundColor: "rgba(244,63,94,.14)", color: "#fb7185" },
}

// Orange "P" circle used to mark the protein score.
function ProteinGlyph() {
  return (
    <span
      className="flex size-3 shrink-0 items-center justify-center rounded-full bg-macro-protein text-[7px] font-bold leading-none text-white"
      aria-hidden="true"
    >
      P
    </span>
  )
}

type PillKind = "protein" | "density"

export function ScorePill({
  kind,
  grade,
  value,
  title,
  ariaLabel,
}: {
  kind: PillKind
  grade: ProteinGrade | null
  value: string | null
  title?: string
  ariaLabel?: string
}) {
  if (grade == null || value == null) {
    return (
      <span
        className="inline-flex min-w-14 items-center justify-center gap-1 rounded-full bg-muted px-2 py-1 text-[10.5px] font-semibold tabular-nums text-muted-foreground"
        title={title}
        aria-label={ariaLabel}
      >
        {kind === "protein" ? <ProteinGlyph /> : <Flame className="size-3 shrink-0" aria-hidden="true" />}
        N/A
      </span>
    )
  }

  return (
    <span
      className="inline-flex min-w-14 items-center justify-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold tabular-nums"
      style={GRADE_STYLES[grade]}
      title={title}
      aria-label={ariaLabel}
    >
      {kind === "protein" ? (
        <ProteinGlyph />
      ) : (
        <Flame className="size-3 shrink-0" style={{ color: GRADE_STYLES[grade].color }} aria-hidden="true" />
      )}
      {grade} · {value}
    </span>
  )
}

// proteinG in grams, kcal in kilocalories.
export function ProteinScoreBadges({ proteinG, kcal }: { proteinG: number; kcal: number; fontSize?: string }) {
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
    />
  )
}
