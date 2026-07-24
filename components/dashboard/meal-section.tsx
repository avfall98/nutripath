"use client"

import { useState, useTransition } from "react"
import { deleteEntry, moveEntry } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO } from "@/lib/types"
import { AddFoodDialog } from "@/components/dashboard/add-food-dialog"
import { EditEntryDialog } from "@/components/dashboard/edit-entry-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { MacroBadges } from "@/components/dashboard/macro-badges"
import { toast } from "sonner"
import { Apple, Edit, MoreVertical, Plus, Trash2 } from "lucide-react"

type SectionGroup = { id: number; name: string } // id -1 = unassigned

const KJ_PER_KCAL = 4.184

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
  const [, startTransition] = useTransition()
  const isReal = group.id !== -1

  const groupCalories = entries.reduce((sum, e) => sum + e.calories * e.quantity, 0)
  const groupCaloriesKcal = round(groupCalories / KJ_PER_KCAL, 0)
  const groupProtein = entries.reduce((sum, e) => sum + e.protein * e.quantity, 0)

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
  const groupProteinPct =
    targetProtein && targetProtein > 0 ? Math.round((groupProtein / targetProtein) * 100) : 0

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

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        {/* Header: name + summary + meal-level score pills */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-1">
          <h3 className="text-sm font-semibold">{group.name}</h3>
          {entries.length > 0 ? (
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {groupCaloriesKcal} kcal{targetCalories ? ` (${groupCaloriesPct}%)` : ""} · {round(groupProtein)}g
              protein{targetProtein ? ` (${groupProteinPct}%)` : ""}
            </span>
          ) : (
            <span className="text-[13px] text-faint">Nothing logged yet</span>
          )}
          {entries.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <ProteinScoreBadges proteinG={groupProtein} kcal={groupCaloriesKcal} />
              {groupServingSize ? (
                <CalorieDensityBadge kcal={groupCaloriesKcal} servingSize={`${groupServingSize}g`} />
              ) : null}
            </div>
          )}
        </div>

        {/* Food rows */}
        {entries.length > 0 && (
          <ul className="flex flex-col">
            {entries.map((entry) => {
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
                <li
                  key={entry.id}
                  className="flex gap-3 border-t border-border py-3 first:border-t-0 first:pt-1"
                >
                  {food?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={food.imageUrl || "/placeholder.svg"}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-track text-faint">
                      <Apple className="size-4" />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* Line 1: name / brand / menu */}
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-pretty">
                        {food?.name || entry.name}
                        <span className="ml-2 text-[11.5px] font-normal text-faint">
                          {qtyLabel} serving{entry.quantity === 1 ? "" : "s"}
                        </span>
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="-mt-1 -mr-1 size-7 text-muted-foreground"
                              aria-label="Item options"
                            />
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
                    </div>
                    {/* Line 2: macro columns + score pills */}
                    <div className="flex items-center gap-3">
                      <MacroBadges
                        variant="columns"
                        kcal={entryCalories}
                        kcalPct={targetCalories ? entryCaloriesPct : null}
                        protein={entryProtein}
                        proteinPct={targetProtein ? entryProteinPct : null}
                        carbs={entryCarbs}
                        fat={entryFat}
                      />
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        <ProteinScoreBadges proteinG={entry.protein} kcal={entry.calories / KJ_PER_KCAL} />
                        <CalorieDensityBadge
                          kcal={round(entry.calories / KJ_PER_KCAL)}
                          servingSize={food?.servingSize || null}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Footer: centered dashed "+ Add food" ghost pill */}
        {isReal ? (
          <div className={entries.length > 0 ? "mt-1 border-t border-border pt-3" : "pt-1"}>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mx-auto flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-5 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-4" />
              Add food
            </button>
          </div>
        ) : (
          entries.length === 0 && (
            <p className="py-2 text-[13px] text-faint">Items whose meal group was removed.</p>
          )
        )}
      </CardContent>

      {isReal && (
        <>
          <AddFoodDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            group={{ id: group.id, name: group.name, sortOrder: 0 }}
            dateKey={dateKey}
            foods={foods}
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
    </Card>
  )
}
