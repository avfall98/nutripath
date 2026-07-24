"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { cn } from "@/lib/utils"
import { round } from "@/lib/format"

const KJ_PER_KCAL = 4.184

export type DayTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type GroupNutrition = {
  id: number
  name: string
  calories: number
  protein: number
  carbs?: number | null
  fat?: number | null
  servingWeightG?: number | null
}

// Single-color segmented progress bar: one meal = one segment, 2px gaps.
function SegmentedBar({
  segments,
  totalPct,
  color,
}: {
  segments: { key: number; pct: number; name: string }[]
  totalPct: number
  color: string
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-track">
      {segments.length > 0 ? (
        <div className="flex h-full w-full gap-[2px]">
          {segments.map((s) => (
            <div
              key={s.key}
              title={s.name}
              style={{ width: `${s.pct}%`, backgroundColor: color }}
              className="h-full rounded-[2px] transition-all"
            />
          ))}
        </div>
      ) : (
        <div style={{ width: `${totalPct}%`, backgroundColor: color }} className="h-full rounded-[3px] transition-all" />
      )}
    </div>
  )
}

function StatCell({
  label,
  labelColor,
  value,
  target,
  unit,
  index,
}: {
  label: string
  labelColor: string
  value: number
  target?: number | null
  unit: string
  index: number
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        index % 2 === 1 && "border-l border-border pl-4",
        index > 0 && "sm:border-l sm:border-border sm:pl-4",
      )}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-[.07em]"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <span className="text-xl font-bold tabular-nums leading-none">
        {round(value).toLocaleString()}
        {target != null && target > 0 ? (
          <span className="ml-1 text-xs font-normal text-faint">
            / {Math.round(target).toLocaleString()}
            {unit === "g" ? "g" : ""}
          </span>
        ) : (
          <span className="ml-0.5 text-xs font-normal text-faint">{unit}</span>
        )}
      </span>
    </div>
  )
}

export function DaySummary({
  totals,
  targetCalories,
  targetProtein,
  mealGroups = [],
  servingWeightG = null,
}: {
  totals: DayTotals
  targetCalories: number | null
  targetProtein: number | null
  mealGroups?: GroupNutrition[]
  servingWeightG?: number | null
}) {
  const caloriesKcal = Math.round(totals.calories / KJ_PER_KCAL)
  const calPct = targetCalories && targetCalories > 0 ? (caloriesKcal / targetCalories) * 100 : 0
  const calOver = targetCalories != null && caloriesKcal > targetCalories
  const calRemaining = targetCalories != null ? Math.round(targetCalories - caloriesKcal) : null
  const calColor = calOver ? "var(--cal-over)" : "var(--primary)"

  const proteinPct = targetProtein && targetProtein > 0 ? (totals.protein / targetProtein) * 100 : 0
  const proteinOver = targetProtein != null && totals.protein > targetProtein
  const proteinRemaining = targetProtein != null ? Math.round(targetProtein - totals.protein) : null

  const calSegments = mealGroups.map((g) => ({
    key: g.id,
    name: g.name,
    pct: targetCalories && targetCalories > 0 ? Math.round(g.calories / KJ_PER_KCAL) / targetCalories * 100 : 0,
  }))
  const proteinSegments = mealGroups.map((g) => ({
    key: g.id,
    name: g.name,
    pct: targetProtein && targetProtein > 0 ? (g.protein / targetProtein) * 100 : 0,
  }))

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          {/* Calories */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Calories</span>
              <span className="flex items-baseline gap-1.5 text-[13px] tabular-nums text-faint">
                <span className="text-foreground font-semibold">{caloriesKcal.toLocaleString()}</span>
                <span>/ {targetCalories != null ? targetCalories.toLocaleString() : "—"} kcal</span>
                {calRemaining != null && (
                  <span>· {calOver ? `${Math.abs(calRemaining)} over` : `${calRemaining} left`}</span>
                )}
                {targetCalories != null && (
                  <span
                    className="font-semibold"
                    style={{ color: calOver ? "var(--cal-over)" : "var(--primary)" }}
                  >
                    · {Math.round(calPct)}%
                  </span>
                )}
              </span>
            </div>
            <SegmentedBar segments={calSegments} totalPct={Math.min(calPct, 100)} color={calColor} />
          </div>

          {/* Protein */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Protein</span>
              <span className="flex items-baseline gap-1.5 text-[13px] tabular-nums text-faint">
                <span className="text-foreground font-semibold">{round(totals.protein)}</span>
                <span>/ {targetProtein != null ? targetProtein : "—"} g</span>
                {proteinRemaining != null && (
                  <span>· {proteinOver ? `${Math.abs(proteinRemaining)}g over` : `${proteinRemaining}g left`}</span>
                )}
                {targetProtein != null && (
                  <span className="font-semibold" style={{ color: "var(--primary)" }}>
                    · {Math.round(proteinPct)}%
                  </span>
                )}
              </span>
            </div>
            <SegmentedBar
              segments={proteinSegments}
              totalPct={Math.min(proteinPct, 100)}
              color="var(--protein-bar)"
            />
          </div>
        </div>

        {/* Day-level score pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ProteinScoreBadges proteinG={totals.protein} kcal={caloriesKcal} />
          {servingWeightG ? <CalorieDensityBadge kcal={caloriesKcal} servingSize={`${servingWeightG}g`} /> : null}
        </div>

        {/* Macro strip */}
        <div className="grid grid-cols-2 gap-y-4 border-t border-border pt-4 sm:grid-cols-4">
          <StatCell index={0} label="Calories" labelColor="var(--stat-calories)" value={caloriesKcal} target={targetCalories} unit=" kcal" />
          <StatCell index={1} label="Protein" labelColor="var(--stat-protein)" value={totals.protein} target={targetProtein} unit="g" />
          <StatCell index={2} label="Carbs" labelColor="var(--stat-carbs)" value={totals.carbs} unit="g" />
          <StatCell index={3} label="Fat" labelColor="var(--stat-fat)" value={totals.fat} unit="g" />
        </div>
      </CardContent>
    </Card>
  )
}
