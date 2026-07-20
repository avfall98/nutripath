"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { cn } from "@/lib/utils"
import { round } from "@/lib/format"

const KJ_PER_KCAL = 4.184

// Discrete color palette for meal groups - high contrast colors
const groupColors = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#EF4444", // Red
  "#14B8A6", // Teal
]

function getGroupColor(groupId: number): string {
  return groupColors[groupId % groupColors.length]
}

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
}

function CalorieBar({ 
  consumed, 
  target,
  groups = []
}: { 
  consumed: number
  target: number | null
  groups?: GroupNutrition[]
}) {
  // Convert kJ to kcal for display (consumed is in kJ, target is already in kcal)
  const consumedKcal = Math.round(consumed / KJ_PER_KCAL)
  const targetKcal = target
  const pct = targetKcal && targetKcal > 0 ? Math.min(consumedKcal / targetKcal, 1) : 0
  const over = targetKcal != null && consumedKcal > targetKcal
  const remaining = targetKcal != null ? Math.round(targetKcal - consumedKcal) : null

  const [hoveredCalorieGroup, setHoveredCalorieGroup] = useState<number | null>(null)

  // Render calorie bar segments
  const renderCalorieSegments = () => {
    let currentPosition = 0
    return groups.map((group, idx) => {
      const groupKcal = Math.round(group.calories / KJ_PER_KCAL)
      const groupPct = targetKcal && targetKcal > 0 ? (groupKcal / targetKcal) * 100 : 0
      const width = Math.min(groupPct, 100 - currentPosition)
      const element = (
        <div
          key={idx}
          className={cn("relative h-full transition-all duration-200 group")}
          style={{
            width: `${width}%`,
            backgroundColor: getGroupColor(group.id),
            opacity: hoveredCalorieGroup === null || hoveredCalorieGroup === group.id ? 1 : 0.3
          }}
          onMouseEnter={() => setHoveredCalorieGroup(group.id)}
          onMouseLeave={() => setHoveredCalorieGroup(null)}
          title={group.name}
        >
          {hoveredCalorieGroup === group.id && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary bg-background/80 px-2 py-1 rounded border border-border pointer-events-none">
              {group.name}
            </div>
          )}
        </div>
      )
      currentPosition += width
      return element
    })
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">Calories</span>
        <span className="flex items-baseline gap-2 text-sm tabular-nums text-muted-foreground">
          <span>
            {consumedKcal}
            {targetKcal != null ? ` / ${Math.round(targetKcal)}` : ""} kcal
          </span>
          {remaining != null && (
            <span className={cn("text-xs font-medium", over ? "text-destructive" : "text-primary")}>
              {over ? `${Math.abs(remaining)} over` : `${remaining} left`}
            </span>
          )}
          {targetKcal != null && (
            <span className="ml-2 font-medium text-primary">{Math.round(pct * 100)}%</span>
          )}
        </span>
      </div>
      <div className="relative flex items-center overflow-x-hidden rounded-full bg-muted" style={{ height: "14px" }}>
        {groups.length > 0 ? (
          renderCalorieSegments()
        ) : (
          <div
            style={{
              width: `${pct * 100}%`,
              backgroundColor: groupColors[0],
              height: "100%",
              borderRadius: "9999px",
              transition: "width 500ms, background-color 500ms"
            }}
          />
        )}
      </div>
    </div>
  )
}

function MacroStat({
  label,
  value,
  target,
  unit,
}: {
  label: string
  value: number
  target?: number | null
  unit: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-secondary/60 p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">
        {round(value)}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
      {target != null && target > 0 && (
        <span className="text-xs text-muted-foreground">of {Math.round(target)}{unit}</span>
      )}
    </div>
  )
}

export function DaySummary({
  totals,
  targetCalories,
  targetProtein,
  mealGroups = [],
}: {
  totals: DayTotals
  targetCalories: number | null
  targetProtein: number | null
  mealGroups?: GroupNutrition[]
}) {
  // Convert kJ to kcal for display (totals.calories is in kJ, targetCalories is already in kcal)
  const caloriesKcal = Math.round(totals.calories / KJ_PER_KCAL)
  const targetCaloriesKcal = targetCalories
  const proteinPct =
    targetProtein && targetProtein > 0 ? Math.min((totals.protein / targetProtein) * 100, 100) : 0
  const proteinRemaining = targetProtein != null ? Math.round(targetProtein - totals.protein) : null
  
  const [hoveredProteinGroup, setHoveredProteinGroup] = useState<number | null>(null)

  // Render protein bar segments
  const renderProteinSegments = () => {
    let currentPosition = 0
    return mealGroups.map((group, idx) => {
      const groupPct = targetProtein && targetProtein > 0 ? (group.protein / targetProtein) * 100 : 0
      const width = Math.min(groupPct, 100 - currentPosition)
      const element = (
        <div
          key={idx}
          className={cn("relative h-full transition-all duration-200 group")}
          style={{
            width: `${width}%`,
            backgroundColor: getGroupColor(group.id),
            opacity: hoveredProteinGroup === null || hoveredProteinGroup === group.id ? 1 : 0.3
          }}
          onMouseEnter={() => setHoveredProteinGroup(group.id)}
          onMouseLeave={() => setHoveredProteinGroup(null)}
          title={group.name}
        >
          {hoveredProteinGroup === group.id && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary bg-background/80 px-2 py-1 rounded border border-border pointer-events-none">
              {group.name}
            </div>
          )}
        </div>
      )
      currentPosition += width
      return element
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-6">
        <div className="flex w-full flex-col gap-5">
          {/* Calorie Bar */}
          <CalorieBar consumed={totals.calories} target={targetCalories} groups={mealGroups} />

          {/* Protein Bar */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-medium">Protein</span>
              <span className="flex items-baseline gap-2 text-sm tabular-nums text-muted-foreground">
                <span>
                  {round(totals.protein)}
                  {targetProtein != null ? ` / ${Math.round(targetProtein)}` : ""} g
                </span>
                {proteinRemaining != null && (
                  <span className={cn("text-xs font-medium", proteinRemaining < 0 ? "text-destructive" : "text-primary")}>
                    {proteinRemaining < 0 ? `${Math.abs(proteinRemaining)}g over` : `${proteinRemaining}g left`}
                  </span>
                )}
                {targetProtein != null && (
                  <span className="ml-2 font-medium text-primary">{Math.round(proteinPct)}%</span>
                )}
              </span>
            </div>
            <div className="relative flex items-center overflow-x-hidden rounded-full bg-muted" style={{ height: "14px" }}>
              {mealGroups.length > 0 ? (
                renderProteinSegments()
              ) : (
                <div
                  style={{
                    width: `${proteinPct}%`,
                    backgroundColor: groupColors[0],
                    height: "100%",
                    borderRadius: "9999px",
                    transition: "width 500ms, background-color 500ms"
                  }}
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <ProteinScoreBadges 
                proteinG={totals.protein}
                kcal={caloriesKcal}
                fontSize="text-[12px]"
              />
              <CalorieDensityBadge kcal={caloriesKcal} servingSize={`${caloriesKcal}g`} />
            </div>
          </div>
        </div>

        {/* Macro Statistics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroStat label="Calories" value={caloriesKcal} target={targetCaloriesKcal} unit=" kcal" />
          <MacroStat label="Protein" value={totals.protein} target={targetProtein} unit="g" />
          <MacroStat label="Carbs" value={totals.carbs} unit="g" />
          <MacroStat label="Fat" value={totals.fat} unit="g" />
        </div>
      </CardContent>
    </Card>
  )
}
