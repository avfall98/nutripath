"use client"

import type { FoodDTO } from "@/lib/types"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { round } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ExternalLink, Link2, UtensilsCrossed } from "lucide-react"

const KJ_PER_KCAL = 4.184

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  food: FoodDTO | null
}

function isValidUrl(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return false
  try {
    const url = new URL(trimmed)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Read-only view of a food's full nutrition details, matching the layout of
 * the "Edit food" dialog in the food library, but with no editable inputs.
 * Used when a user taps a food while browsing the "Add to <meal>" picker so
 * they can inspect a food without being able to modify library data.
 */
export function FoodDetailDialog({ open, onOpenChange, food }: Props) {
  if (!food) return null

  const servingUnitMatch = food.servingSize?.match(/(g|ml)\s*$/i)
  const servingUnit = servingUnitMatch ? servingUnitMatch[1].toLowerCase() : "g"

  const gridCols =
    "grid grid-cols-[1fr_minmax(0,6rem)_minmax(0,6rem)] gap-3 sm:grid-cols-[1fr_minmax(0,9rem)_minmax(0,9rem)] sm:gap-4"
  const cellClass = "flex h-10 items-center justify-end px-3 text-sm tabular-nums text-foreground"
  const labelClass = "text-sm font-semibold text-foreground"

  const renderNutrientRow = (
    label: string,
    servingValue: number | null,
    hundredValue: number | null,
    indent = false,
  ) => (
    <div key={label} className={cn(gridCols, "items-center border-t border-border/40 py-2.5")}>
      <span className={cn("text-sm", indent ? "pl-4 text-muted-foreground" : "font-medium text-foreground")}>
        {label}
      </span>
      <span className={cellClass}>{servingValue != null ? round(servingValue, 1) : "—"}</span>
      <span className={cellClass}>{hundredValue != null ? round(hundredValue, 1) : "—"}</span>
    </div>
  )

  const caloriesKcal = food.calories != null ? round(food.calories / KJ_PER_KCAL, 1) : null
  const caloriesPerHundredKcal =
    food.caloriesPerHundred != null ? round(food.caloriesPerHundred / KJ_PER_KCAL, 1) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto rounded-2xl p-6 ring-0 sm:max-w-3xl sm:p-8">
        <DialogHeader className="mb-6 pr-10">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight">{food.name}</DialogTitle>
            <DialogDescription>Food details from your library. Editing is available from the Foods tab.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className={cn(
                "relative size-24 shrink-0 overflow-hidden rounded-2xl",
                food.imageUrl ? "bg-muted" : "border-2 border-dashed border-border/70 bg-transparent",
              )}
            >
              {food.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-faint">
                  <UtensilsCrossed className="size-6" />
                </span>
              )}
            </span>

            <div className="grid basis-full gap-5 sm:w-auto sm:flex-1 sm:basis-auto sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Name</span>
                <div className="flex h-11 items-center rounded-md bg-inset px-3.5 text-sm text-foreground">
                  {food.name}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Brand</span>
                <div className="flex h-11 items-center rounded-md bg-inset px-3.5 text-sm text-foreground">
                  {food.brand || <span className="text-faint">—</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Serving size</span>
                <div className="flex h-11 items-center rounded-md bg-inset px-3.5 text-sm text-foreground">
                  {food.servingSize || <span className="text-faint">—</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Servings / pack</span>
                <div className="flex h-11 items-center rounded-md bg-inset px-3.5 text-sm text-foreground">
                  {food.servingsPack || <span className="text-faint">—</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Pack size</span>
                <div className="flex h-11 items-center rounded-md bg-inset px-3.5 text-sm text-foreground">
                  {food.packSize || <span className="text-faint">—</span>}
                </div>
              </div>
            </div>

            {isValidUrl(food.infoUrl) && (
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Reference link</span>
                <div className="relative min-w-0">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <div className="flex h-11 min-w-0 items-center rounded-md bg-inset px-3.5 pl-10 pr-10 text-sm text-foreground">
                    <span className="truncate">{food.infoUrl}</span>
                  </div>
                  <a
                    href={food.infoUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open reference link in a new tab"
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-faint transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-col">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                Nutrition information
              </h3>
              <div className={cn(gridCols, "pb-1")}>
                <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint">Nutrient</span>
                <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  Per serving
                </span>
                <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  Per 100{servingUnit}
                </span>
              </div>

              {renderNutrientRow("Energy (kJ)", food.calories, food.caloriesPerHundred)}
              {renderNutrientRow("Calories (kcal)", caloriesKcal, caloriesPerHundredKcal)}
              {renderNutrientRow("Protein (g)", food.protein, food.proteinPerHundred)}
              {renderNutrientRow("Fat (g)", food.fat, food.fatPerHundred)}
              {renderNutrientRow("— Saturated (g)", food.saturatedFat, food.saturatedFatPerHundred, true)}
              {renderNutrientRow("Carbs (g)", food.carbs, food.carbsPerHundred)}
              {renderNutrientRow("— Sugars (g)", food.sugars, food.sugarsPerHundred, true)}
              {renderNutrientRow("Dietary fibre (g)", food.dietaryFiber, food.dietaryFiberPerHundred)}
              {renderNutrientRow("Sodium (mg)", food.sodium, food.sodiumPerHundred)}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-inset p-4 sm:p-5">
              <div>
                <p className="text-sm font-bold text-foreground">Food score</p>
                <p className="text-xs text-faint">Protein score per 100 kcal · calorie density per 100g</p>
              </div>
              <div className="flex items-center gap-1.5">
                <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal ?? 0} />
                <CalorieDensityBadge kcal={caloriesPerHundredKcal ?? 0} servingSize="100" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
