"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { cn } from "@/lib/utils"
import { round } from "@/lib/format"

const KJ_PER_KCAL = 4.184

function getGradientColor(percentage: number, isHigherBetter: boolean): string {
  // Clamp percentage between 0 and 1
  const pct = Math.min(Math.max(percentage / 100, 0), 1)
  
  if (isHigherBetter) {
    // Protein: Red -> Green (higher is better)
    // Red: #EF4444, Green: #22C55E
    const red = Math.round(239 - (239 - 34) * pct)
    const green = Math.round(68 + (197 - 68) * pct)
    const blue = Math.round(68 + (94 - 68) * pct)
    return `rgb(${red}, ${green}, ${blue})`
  } else {
    // Calories: Green -> Red (lower is better)
    // Green: #22C55E, Red: #EF4444
    const red = Math.round(34 + (239 - 34) * pct)
    const green = Math.round(197 - (197 - 68) * pct)
    const blue = Math.round(94 - (94 - 68) * pct)
    return `rgb(${red}, ${green}, ${blue})`
  }
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

function CalorieRing({ 
  consumed, 
  target,
  groups = []
}: { 
  consumed: number
  target: number | null
  groups?: GroupNutrition[]
}) {
  const size = 176
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Convert kJ to kcal for display (consumed is in kJ, target is already in kcal)
  const consumedKcal = Math.round(consumed / KJ_PER_KCAL)
  const targetKcal = target
  const pct = targetKcal && targetKcal > 0 ? Math.min(consumedKcal / targetKcal, 1) : 0
  const over = targetKcal != null && consumedKcal > targetKcal
  const remaining = targetKcal != null ? Math.round(targetKcal - consumedKcal) : null

  // Calculate group chunks
  const groupChunks = groups.map(g => ({
    ...g,
    caloriesKcal: Math.round(g.calories / KJ_PER_KCAL),
    pct: targetKcal && targetKcal > 0 ? (Math.round(g.calories / KJ_PER_KCAL)) / targetKcal : 0
  }))

  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null)

  // Render segments
  const renderSegments = () => {
    let currentOffset = 0
    return groupChunks.map((group, idx) => {
      const segmentPct = Math.min(group.pct, 1 - currentOffset)
      const segmentDasharray = circumference * segmentPct
      const segmentDashoffset = circumference - circumference * currentOffset - segmentDasharray
      const ringColor = getGradientColor((group.pct * 100), false)
      
      const element = (
        <circle
          key={idx}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={segmentDasharray}
          strokeDashoffset={segmentDashoffset}
          className={cn("transition-opacity duration-200 cursor-pointer", 
            hoveredGroup === null || hoveredGroup === group.id ? "opacity-100" : "opacity-30"
          )}
          onMouseEnter={() => setHoveredGroup(group.id)}
          onMouseLeave={() => setHoveredGroup(null)}
          style={{
            filter: hoveredGroup === group.id ? "drop-shadow(0 0 8px rgba(0,0,0,0.3))" : "none"
          }}
        />
      )
      
      currentOffset += segmentPct
      return element
    })
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        {groups.length > 0 ? renderSegments() : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getGradientColor((pct * 100), false)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="transition-[stroke-dashoffset,stroke] duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tabular-nums">{consumedKcal}</span>
        <span className="text-xs text-muted-foreground">
          {targetKcal != null ? `of ${targetKcal} kcal` : "kcal today"}
        </span>
        {targetKcal != null && (
          <span className="text-xs font-medium text-primary">
            {Math.round(pct * 100)}%
          </span>
        )}
        {remaining != null && (
          <span className={cn("mt-1 text-xs font-medium", over ? "text-destructive" : "text-primary")}>
            {over ? `${Math.abs(remaining)} over` : `${remaining} left`}
          </span>
        )}
        {hoveredGroup !== null && (
          <span className="absolute top-4 text-xs font-medium text-primary">
            {groups.find(g => g.id === hoveredGroup)?.name}
          </span>
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
          className={cn("relative h-full transition-all duration-200 cursor-pointer group")}
          style={{
            width: `${width}%`,
            backgroundColor: getGradientColor(groupPct, true),
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
      <CardContent className="flex flex-col items-center gap-6 py-6 md:flex-row md:items-center md:gap-8">
        <CalorieRing consumed={totals.calories} target={targetCalories} groups={mealGroups} />

        <div className="flex w-full flex-1 flex-col gap-4">
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
                    backgroundColor: getGradientColor(proteinPct, true),
                    height: "100%",
                    borderRadius: "9999px",
                    transition: "width 500ms, background-color 500ms"
                  }}
                />
              )}
            </div>
            <div className="mt-2">
              <ProteinScoreBadges 
                proteinG={totals.protein}
                kcal={caloriesKcal}
                fontSize="text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
            <MacroStat label="Calories" value={caloriesKcal} target={targetCaloriesKcal} unit=" kcal" />
            <MacroStat label="Protein" value={totals.protein} target={targetProtein} unit="g" />
            <MacroStat label="Carbs" value={totals.carbs} unit="g" />
            <MacroStat label="Fat" value={totals.fat} unit="g" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
