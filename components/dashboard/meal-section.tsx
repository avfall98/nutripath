"use client"

import { useState, useTransition } from "react"
import { deleteEntry, moveEntry } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO } from "@/lib/types"
import { AddFoodDialog } from "@/components/dashboard/add-food-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "sonner"
import { Apple, MoreVertical, Plus, Trash2 } from "lucide-react"

type SectionGroup = { id: number; name: string } // id -1 = unassigned

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
  const [, startTransition] = useTransition()
  const isReal = group.id !== -1

  const KJ_PER_KCAL = 4.184
  const groupCalories = entries.reduce((sum, e) => sum + e.calories * e.quantity, 0)
  const groupCaloriesKcal = round(groupCalories / KJ_PER_KCAL, 0)
  const groupProtein = entries.reduce((sum, e) => sum + e.protein * e.quantity, 0)
  
  const groupCaloriesPct = targetCalories && targetCalories > 0 ? Math.round((groupCaloriesKcal / targetCalories) * 100) : 0
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

  return (
    <Card>
      <CardHeader className="relative flex flex-col gap-2 pb-3">
        <div className="flex flex-row items-center gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{group.name}</CardTitle>
            {entries.length > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {groupCaloriesKcal} kcal{targetCalories ? ` (${groupCaloriesPct}%)` : ""} · {round(groupProtein)}g protein{targetProtein ? ` (${groupProteinPct}%)` : ""}
              </span>
            )}
          </div>
        </div>
        {isReal && (
          <Button size="sm" className="absolute right-4 top-4 w-20 shrink-0" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
        )}
        {entries.length > 0 && (
          <ProteinScoreBadges proteinG={groupProtein} kcal={groupCaloriesKcal} fontSize="text-[12px]" />
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            {isReal ? "Nothing logged yet." : "Items whose meal group was removed."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {entries.map((entry) => {
              const food = entry.foodId ? foods.find((f) => f.id === entry.foodId) : null
              return (
              <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {food?.imageUrl ? (
                  <img
                    src={food.imageUrl}
                    alt={entry.name}
                    className="size-9 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Apple className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  {(() => {
                    const entryCalories = round(entry.calories * entry.quantity / KJ_PER_KCAL, 0)
                    const entryProtein = round(entry.protein * entry.quantity)
                    const entryCaloriesPct = targetCalories && targetCalories > 0 ? Math.round((entryCalories / targetCalories) * 100) : 0
                    const entryProteinPct = targetProtein && targetProtein > 0 ? Math.round((entryProtein / targetProtein) * 100) : 0
                    return (
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {entryCalories} kcal{targetCalories ? ` (${entryCaloriesPct}%)` : ""} · {entryProtein}g protein{targetProtein ? ` (${entryProteinPct}%)` : ""}
                      </p>
                    )
                  })()}
                  <ProteinScoreBadges proteinG={entry.protein} kcal={entry.calories / KJ_PER_KCAL} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button size="icon" variant="ghost" className="size-8" aria-label="Item options" />}
                  >
                    <MoreVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
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
              </li>
            )
            })}
          </ul>
        )}
      </CardContent>

      {isReal && (
        <AddFoodDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          group={{ id: group.id, name: group.name, sortOrder: 0 }}
          dateKey={dateKey}
          foods={foods}
          onAdded={onChanged}
        />
      )}
    </Card>
  )
}
