"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges } from "@/components/dashboard/macro-badges"
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
  heightClass = "h-1.5",
  mealGroupsData = [],
  targetCalories = null,
  targetProtein = null,
}: {
  segments: { key: number; pct: number; name: string }[]
  totalPct: number
  color: string
  heightClass?: string
  mealGroupsData?: GroupNutrition[]
  targetCalories?: number | null
  targetProtein?: number | null
}) {
  const [openPopover, setOpenPopover] = useState<number | null>(null)

  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-track", heightClass)}>
      {segments.length > 0 ? (
        <div className="flex h-full w-full gap-[2px]">
          {segments.map((s) => {
            const groupData = mealGroupsData.find((g) => g.id === s.key)
            const isOpen = openPopover === s.key
            const groupKcal = groupData ? Math.round(groupData.calories / KJ_PER_KCAL) : 0
            const groupKcalPct =
              groupData && targetCalories && targetCalories > 0
                ? Math.round((groupKcal / targetCalories) * 100)
                : null
            const groupProteinPct =
              groupData && targetProtein && targetProtein > 0
                ? Math.round((groupData.protein / targetProtein) * 100)
                : null

            return (
              <Popover key={s.key} open={isOpen} onOpenChange={(open) => setOpenPopover(open ? s.key : null)}>
                <PopoverTrigger
                  style={{ width: `${s.pct}%`, backgroundColor: color }}
                  className="block h-full cursor-pointer appearance-none rounded-[2px] border-0 p-0 transition-all hover:opacity-80"
                  title={s.name}
                  aria-label={s.name}
                />
                {groupData && (
                  <PopoverContent className="w-auto p-4">
                    <div className="flex flex-col gap-3">
                      <div className="border-b border-border pb-2">
                        <h4 className="font-semibold text-foreground">{groupData.name}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <MacroBadges
                          kcal={groupKcal}
                          kcalPct={groupKcalPct}
                          protein={groupData.protein}
                          proteinPct={groupProteinPct}
                          carbs={groupData.carbs ?? null}
                          fat={groupData.fat ?? null}
                        />
                        {groupData.servingWeightG ? (
                          <CalorieDensityBadge kcal={groupKcal} servingSize={`${groupData.servingWeightG}g`} />
                        ) : null}
                        <ProteinScoreBadges proteinG={groupData.protein} kcal={groupKcal} />
                      </div>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            )
          })}
        </div>
      ) : (
        <div style={{ width: `${totalPct}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
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
      <span className="text-[11px] font-semibold uppercase tracking-[.07em]" style={{ color: labelColor }}>
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

// Standalone Spotify-style stat card (desktop).
function StatCard({
  label,
  labelColor,
  value,
  target,
  unit,
}: {
  label: string
  labelColor: string
  value: number
  target?: number | null
  unit: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-card p-5 transition-colors hover:bg-card-hover">
      <span className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: labelColor }}>
        {label}
      </span>
      <span className="text-[28px] font-extrabold tabular-nums leading-none">
        {round(value).toLocaleString()}
        {target != null && target > 0 ? (
          <span className="ml-1 text-sm font-medium text-faint">
            / {Math.round(target).toLocaleString()}
            {unit === "g" ? "g" : ""}
          </span>
        ) : (
          <span className="ml-1 text-sm font-medium text-faint">{unit}</span>
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
    pct: targetCalories && targetCalories > 0 ? (Math.round(g.calories / KJ_PER_KCAL) / targetCalories) * 100 : 0,
  }))
  const proteinSegments = mealGroups.map((g) => ({
    key: g.id,
    name: g.name,
    pct: targetProtein && targetProtein > 0 ? (g.protein / targetProtein) * 100 : 0,
  }))

  return (
    <>
      {/* ---------- Desktop hero ---------- */}
      <div className="hidden flex-col gap-6 md:flex">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[52px] font-black leading-none tabular-nums tracking-[-1.5px]">
                {caloriesKcal.toLocaleString()}
              </span>
              <span className="text-lg font-medium text-faint">
                / {targetCalories != null ? targetCalories.toLocaleString() : "—"} kcal
              </span>
              <div className="flex items-center gap-2">
                {servingWeightG ? <CalorieDensityBadge kcal={caloriesKcal} servingSize={`${servingWeightG}g`} size="lg" /> : null}
              </div>
            </div>
            {targetCalories != null && (
              <span className="text-sm tabular-nums text-faint">
                {calRemaining != null && (calOver ? `${Math.abs(calRemaining)} over` : `${calRemaining} left`)} ·{" "}
                <span className="font-bold" style={{ color: calColor }}>
                  {Math.round(calPct)}%
                </span>
              </span>
            )}
          </div>
              <SegmentedBar segments={calSegments} totalPct={Math.min(calPct, 100)} color={calColor} heightClass="h-2" mealGroupsData={mealGroups} targetCalories={targetCalories} targetProtein={targetProtein} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[52px] font-black leading-none tabular-nums tracking-[-1.5px]">
                {round(totals.protein).toLocaleString()}
              </span>
              <span className="text-lg font-medium text-faint">
                / {targetProtein != null ? targetProtein : "—"} g
              </span>
              <div className="flex items-center gap-2">
                <ProteinScoreBadges proteinG={totals.protein} kcal={caloriesKcal} size="lg" />
              </div>
            </div>
            {targetProtein != null && (
              <span className="text-sm tabular-nums text-faint">
                {proteinRemaining != null && (proteinOver ? `${Math.abs(proteinRemaining)}g over` : `${proteinRemaining}g left`)} ·{" "}
                <span className="font-bold" style={{ color: proteinOver ? "var(--cal-over)" : "var(--primary)" }}>
                  {Math.round(proteinPct)}%
                </span>
              </span>
            )}
          </div>
          <SegmentedBar
            segments={proteinSegments}
            totalPct={Math.min(proteinPct, 100)}
            color="var(--protein-bar)"
            heightClass="h-2"
            mealGroupsData={mealGroups}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
          />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Calories" labelColor="var(--stat-calories)" value={caloriesKcal} target={targetCalories} unit=" kcal" />
          <StatCard label="Protein" labelColor="var(--stat-protein)" value={totals.protein} target={targetProtein} unit="g" />
          <StatCard label="Carbs" labelColor="var(--stat-carbs)" value={totals.carbs} unit="g" />
          <StatCard label="Fat" labelColor="var(--stat-fat)" value={totals.fat} unit="g" />
        </div>
      </div>

      {/* ---------- Mobile card ---------- */}
      <Card className="md:hidden">
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            {/* Calories */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">Calories</span>
                <span className="flex items-baseline gap-1.5 text-[13px] tabular-nums text-faint">
                  <span className="font-semibold text-foreground">{caloriesKcal.toLocaleString()}</span>
                  <span>/ {targetCalories != null ? targetCalories.toLocaleString() : "—"} kcal</span>
                  {calRemaining != null && (
                    <span>· {calOver ? `${Math.abs(calRemaining)} over` : `${calRemaining} left`}</span>
                  )}
                  {targetCalories != null && (
                    <span className="font-semibold" style={{ color: calColor }}>
                      · {Math.round(calPct)}%
                    </span>
                  )}
                </span>
              </div>
              <SegmentedBar segments={calSegments} totalPct={Math.min(calPct, 100)} color={calColor} heightClass="h-2" mealGroupsData={mealGroups} targetCalories={targetCalories} targetProtein={targetProtein} />
            </div>

            {/* Protein */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">Protein</span>
                <span className="flex items-baseline gap-1.5 text-[13px] tabular-nums text-faint">
                  <span className="font-semibold text-foreground">{round(totals.protein)}</span>
                  <span>/ {targetProtein != null ? targetProtein : "—"} g</span>
                  {proteinRemaining != null && (
                    <span>· {proteinOver ? `${Math.abs(proteinRemaining)}g over` : `${proteinRemaining}g left`}</span>
                  )}
                  {targetProtein != null && (
                    <span className="font-semibold text-primary">· {Math.round(proteinPct)}%</span>
                  )}
                </span>
              </div>
              <SegmentedBar
                segments={proteinSegments}
                totalPct={Math.min(proteinPct, 100)}
                color="var(--protein-bar)"
                heightClass="h-2"
                mealGroupsData={mealGroups}
                targetCalories={targetCalories}
                targetProtein={targetProtein}
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
    </>
  )
}
