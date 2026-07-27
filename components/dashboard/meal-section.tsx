"use client"

import { useState, useTransition } from "react"
import { deleteEntry, moveEntry } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO } from "@/lib/types"
import { AddFoodDialog } from "@/components/dashboard/add-food-dialog"
import { EditEntryDialog } from "@/components/dashboard/edit-entry-dialog"
import { FoodFormDialog } from "@/components/foods/food-form-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { round } from "@/lib/format"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Apple, Edit, MoreVertical, Plus, Trash2 } from "lucide-react"

type SectionGroup = { id: number; name: string } // id -1 = unassigned

const KJ_PER_KCAL = 4.184

// Shared grid template so header + rows align vertically.
const ROW_GRID =
  "grid grid-cols-[20px_40px_1fr_auto_32px] items-center gap-x-3 md:grid-cols-[20px_44px_1fr_120px_112px_60px_60px_80px_80px_32px]"

export function MealSection({
  group,
  entries,
  dateKey,
  foods,
  allGroups,
  targetCalories,
  targetProtein,
  onChanged,
}: {
  group: SectionGroup
  entries: EntryDTO[]
  dateKey: string
  foods: FoodDTO[]
  allGroups: MealGroupDTO[]
  targetCalories: number | null
  targetProtein: number | null
  onChanged: () => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<EntryDTO | null>(null)
  const [foodEditOpen, setFoodEditOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodDTO | null>(null)
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; label: string; percentage: number; x: number; y: number }>({
    visible: false,
    label: "",
    percentage: 0,
    x: 0,
    y: 0,
  })
  const [, startTransition] = useTransition()
  const isReal = group.id !== -1

  const groupCalories = entries.reduce((sum, e) => sum + e.calories * e.quantity, 0)
  const groupCaloriesKcal = round(groupCalories / KJ_PER_KCAL, 0)
  const groupProtein = entries.reduce((sum, e) => sum + e.protein * e.quantity, 0)

  const hasCarbs = entries.some((e) => e.carbs != null)
  const hasFat = entries.some((e) => e.fat != null)
  const groupCarbs = hasCarbs
    ? round(entries.reduce((sum, e) => sum + (e.carbs != null ? e.carbs * e.quantity : 0), 0))
    : null
  const groupFat = hasFat
    ? round(entries.reduce((sum, e) => sum + (e.fat != null ? e.fat * e.quantity : 0), 0))
    : null

  const groupServingSize =
    entries.length > 0
      ? entries
          .map((e) => {
            const food = foods.find((f) => f.id === e.foodId)
            const servingSize = food?.servingSize || null
            if (!servingSize) return null
            const match = servingSize.match(/([\d.]+)/)
            if (!match) return null
            const value = Number(match[1])
            return Number.isFinite(value) && value > 0 ? value * e.quantity : null
          })
          .filter((v): v is number => v !== null)
          .reduce((sum, v) => sum + v, 0) || null
      : null

  const groupCaloriesPct =
    targetCalories && targetCalories > 0 ? Math.round((groupCaloriesKcal / targetCalories) * 100) : 0
  const groupProteinPct = targetProtein && targetProtein > 0 ? Math.round((groupProtein / targetProtein) * 100) : 0

  function remove(entry: EntryDTO) {
    startTransition(async () => {
      await deleteEntry(entry.id)
      toast.success("Item removed.")
      onChanged()
    })
  }

  function move(entry: EntryDTO, target: MealGroupDTO) {
    startTransition(async () => {
      await moveEntry(entry.id, target.id, target.name)
      onChanged()
    })
  }

  function entryMenu(entry: EntryDTO) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" aria-label="Item options" />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setSelectedEntry(entry)
                setEditOpen(true)
              }}
            >
              <Edit data-icon="inline-start" />
              Edit entry
            </DropdownMenuItem>
            {allGroups.filter((g) => g.id !== entry.mealGroupId).length > 0 && (
              <>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {allGroups
                  .filter((g) => g.id !== entry.mealGroupId)
                  .map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => move(entry, g)}>
                      {g.name}
                    </DropdownMenuItem>
                  ))}
              </>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => remove(entry)}>
              <Trash2 data-icon="inline-start" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function thumb(food: FoodDTO | null | undefined) {
    return food?.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-10 shrink-0 rounded-[4px] object-cover" />
    ) : (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[4px] bg-track text-faint">
        <Apple className="size-4" />
      </span>
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg bg-card p-4 md:bg-transparent md:p-0">
      {/* Header: name + (mobile-only) summary + meal score pills */}
      <div className="flex flex-col gap-2">
        <h3
          className={cn(
            "text-lg font-extrabold tracking-[-0.3px]",
            entries.length === 0 && "text-muted-foreground",
          )}
        >
          {group.name}
        </h3>
        {entries.length > 0 ? (
          <div className="flex flex-col gap-2 md:hidden">
            {/* Macro badges row */}
            <MacroBadges
              kcal={groupCaloriesKcal}
              kcalPct={targetCalories ? groupCaloriesPct : null}
              protein={groupProtein}
              proteinPct={targetProtein ? groupProteinPct : null}
              carbs={groupCarbs}
              fat={groupFat}
            />
            {/* Score badges row */}
            <div className="flex items-center gap-1.5">
              <ProteinScoreBadges proteinG={groupProtein} kcal={groupCaloriesKcal} />
              {groupServingSize ? (
                <CalorieDensityBadge kcal={groupCaloriesKcal} servingSize={`${groupServingSize}g`} />
              ) : null}
            </div>
          </div>
        ) : (
          <span className="text-[13px] text-faint">Nothing logged yet</span>
        )}
      </div>

      {/* Desktop column header */}
      {entries.length > 0 && (
        <div
          className={cn(
            ROW_GRID,
            "hidden border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint md:grid",
          )}
        >
          <span className="text-right">#</span>
          <span />
          <span>Food</span>
          <span>Kcal</span>
          <span>Protein</span>
          <span>Carbs</span>
          <span>Fat</span>
          <span className="text-right">Kcal score</span>
          <span className="text-right">P score</span>
          <span />
        </div>
      )}

      {/* Desktop totals row */}
      {entries.length > 0 && (
        <div
          className={cn(
            ROW_GRID,
            "hidden rounded-[4px] border-b border-white/10 bg-white/[0.04] px-2 py-2.5 md:grid",
          )}
        >
          <span />
          <span />
          <div className="flex flex-col gap-2">
            {/* Kcal progress bar */}
            <div
              className="relative cursor-help"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltipState({
                  visible: true,
                  label: "Kcal",
                  percentage: groupCaloriesPct,
                  x: rect.left,
                  y: rect.top - 8,
                })
              }}
              onMouseLeave={() => setTooltipState({ ...tooltipState, visible: false })}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltipState({
                  visible: !tooltipState.visible,
                  label: "Kcal",
                  percentage: groupCaloriesPct,
                  x: rect.left,
                  y: rect.top - 8,
                })
              }}
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div
                  style={{
                    width: `${Math.min(groupCaloriesPct, 100)}%`,
                    backgroundColor: "var(--primary)",
                  }}
                  className="h-full rounded-full transition-all"
                />
              </div>
            </div>
            {/* Protein progress bar */}
            <div
              className="relative cursor-help"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltipState({
                  visible: true,
                  label: "Protein",
                  percentage: groupProteinPct,
                  x: rect.left,
                  y: rect.top - 8,
                })
              }}
              onMouseLeave={() => setTooltipState({ ...tooltipState, visible: false })}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltipState({
                  visible: !tooltipState.visible,
                  label: "Protein",
                  percentage: groupProteinPct,
                  x: rect.left,
                  y: rect.top - 8,
                })
              }}
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div
                  style={{
                    width: `${Math.min(groupProteinPct, 100)}%`,
                    backgroundColor: "var(--protein-bar)",
                  }}
                  className="h-full rounded-full transition-all"
                />
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
            <MacroIcon macro="calories" />
            {groupCaloriesKcal}
            {targetCalories ? <span className="font-normal text-faint">({groupCaloriesPct}%)</span> : null}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
            <MacroIcon macro="protein" />
            {round(groupProtein)}
            {targetProtein ? <span className="font-normal text-faint">({groupProteinPct}%)</span> : null}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
            <MacroIcon macro="carbs" />
            {groupCarbs ?? "—"}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
            <MacroIcon macro="fat" />
            {groupFat ?? "—"}
          </span>
          <div className="flex items-center justify-end">
            {groupServingSize ? (
              <CalorieDensityBadge kcal={groupCaloriesKcal} servingSize={`${groupServingSize}g`} />
            ) : null}
          </div>
          <div className="flex items-center justify-end">
            <ProteinScoreBadges proteinG={groupProtein} kcal={groupCaloriesKcal} />
          </div>
          <span />
        </div>
      )}

      {/* Rows */}
      {entries.length > 0 && (
        <ul className="flex flex-col">
          {entries.map((entry, i) => {
            const food = entry.foodId ? foods.find((f) => f.id === entry.foodId) : null
            const entryCalories = round((entry.calories * entry.quantity) / KJ_PER_KCAL, 0)
            const entryProtein = round(entry.protein * entry.quantity)
            const entryCarbs = entry.carbs != null ? round(entry.carbs * entry.quantity) : null
            const entryFat = entry.fat != null ? round(entry.fat * entry.quantity) : null
            const entryCaloriesPct =
              targetCalories && targetCalories > 0 ? Math.round((entryCalories / targetCalories) * 100) : 0
            const entryProteinPct =
              targetProtein && targetProtein > 0 ? Math.round((entryProtein / targetProtein) * 100) : 0
            const qtyLabel = entry.quantity % 1 === 0 ? entry.quantity.toFixed(1) : String(entry.quantity)
            return (
              <li key={entry.id}>
                {/* Desktop table row */}
                <div className={cn(ROW_GRID, "hidden rounded-[4px] px-2 py-2.5 hover:bg-white/[0.08] md:grid")}>
                  <span className="text-right text-[13px] tabular-nums text-faint">{i + 1}</span>
                  <button
                    type="button"
                    disabled={!food}
                    onClick={() => {
                      if (!food) return
                      setSelectedFood(food)
                      setFoodEditOpen(true)
                    }}
                    className="flex items-center justify-center rounded-[4px] transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                  >
                    {thumb(food)}
                  </button>
                  <button
                    type="button"
                    disabled={!food}
                    onClick={() => {
                      if (!food) return
                      setSelectedFood(food)
                      setFoodEditOpen(true)
                    }}
                    className="min-w-0 text-left transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                  >
                    <p className="truncate text-[14px] font-semibold leading-tight">{food?.name || entry.name}</p>
                    <p className="text-[11.5px] text-faint">
                      {qtyLabel} serving{entry.quantity === 1 ? "" : "s"}
                    </p>
                  </button>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="calories" />
                    {entryCalories}
                    {targetCalories ? <span className="font-normal text-faint">({entryCaloriesPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="protein" />
                    {entryProtein}
                    {targetProtein ? <span className="font-normal text-faint">({entryProteinPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="carbs" />
                    {entryCarbs ?? "—"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="fat" />
                    {entryFat ?? "—"}
                  </span>
                  <div className="flex items-center justify-end">
                    <CalorieDensityBadge kcal={round(entry.calories / KJ_PER_KCAL)} servingSize={food?.servingSize || null} />
                  </div>
                  <div className="flex items-center justify-end">
                    <ProteinScoreBadges proteinG={entry.protein} kcal={entry.calories / KJ_PER_KCAL} />
                  </div>
                  <div className="flex justify-end">{entryMenu(entry)}</div>
                </div>

                {/* Mobile stacked row */}
                <div className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 md:hidden">
                  {/* Row 1: Thumbnail + Name/Quantity + Menu */}
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={!food}
                      onClick={() => {
                        if (!food) return
                        setSelectedFood(food)
                        setFoodEditOpen(true)
                      }}
                      className="flex size-10 shrink-0 rounded-[4px] transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                    >
                      {thumb(food)}
                    </button>
                    <button
                      type="button"
                      disabled={!food}
                      onClick={() => {
                        if (!food) return
                        setSelectedFood(food)
                        setFoodEditOpen(true)
                      }}
                      className="min-w-0 flex-1 text-left transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                    >
                      <p className="text-[13.5px] font-semibold leading-tight text-pretty">
                        {food?.name || entry.name}
                        <span className="block md:ml-2 md:inline text-[11.5px] font-normal text-faint">
                          {qtyLabel} serving{entry.quantity === 1 ? "" : "s"}
                        </span>
                      </p>
                    </button>
                    <div className="-mt-1 -mr-1">{entryMenu(entry)}</div>
                  </div>
                  
                  {/* Row 2: Nutrition stats */}
                  <MacroBadges
                    kcal={entryCalories}
                    kcalPct={targetCalories ? entryCaloriesPct : null}
                    protein={entryProtein}
                    proteinPct={targetProtein ? entryProteinPct : null}
                    carbs={entryCarbs}
                    fat={entryFat}
                  />
                  
                  {/* Row 3: Score badges */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ProteinScoreBadges proteinG={entry.protein} kcal={entry.calories / KJ_PER_KCAL} />
                    <CalorieDensityBadge kcal={round(entry.calories / KJ_PER_KCAL)} servingSize={food?.servingSize || null} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Desktop add-food button centered at bottom of table */}
      {isReal && (
        <div
          className={cn(
            "hidden justify-center md:flex",
            entries.length > 0 ? "border-t border-white/10 pt-2" : "pt-1",
          )}
        >
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add food"
            className="flex size-8 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}

      {/* Mobile add-food dashed pill (kept from existing structure) */}
      {isReal ? (
        <div className={cn("md:hidden", entries.length > 0 ? "mt-1 border-t border-border pt-3" : "pt-1")}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add food"
            className="mx-auto flex size-9 items-center justify-center rounded-full border border-dashed border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        entries.length === 0 && <p className="py-2 text-[13px] text-faint">Items whose meal group was removed.</p>
      )}

      {isReal && (
        <>
          <AddFoodDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            group={{ id: group.id, name: group.name, sortOrder: 0 }}
            dateKey={dateKey}
            foods={foods}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
            onAdded={onChanged}
          />
          {selectedEntry && (
            <EditEntryDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              entry={selectedEntry}
              foods={foods}
              onUpdated={onChanged}
            />
          )}
        </>
      )}

      <FoodFormDialog
        open={foodEditOpen}
        onOpenChange={setFoodEditOpen}
        food={selectedFood}
        onSaved={onChanged}
      />

      {/* Tooltip popup */}
      {tooltipState.visible && (
        <div
          style={{
            position: "fixed",
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y}px`,
            transform: "translateY(-100%)",
            zIndex: 50,
          }}
          className="pointer-events-none whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg"
        >
          <span>{tooltipState.label}</span>
          <span className="ml-2 font-semibold">{tooltipState.percentage}%</span>
        </div>
      )}
    </section>
  )
}
