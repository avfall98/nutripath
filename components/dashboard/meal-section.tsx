"use client"

import { useState, useTransition } from "react"
import { deleteEntry, moveEntry, updateEntryQuantity } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO } from "@/lib/types"
import { AddFoodDialog } from "@/components/dashboard/add-food-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { round } from "@/lib/format"
import { toast } from "sonner"
import { Apple, Minus, MoreVertical, Plus, Trash2 } from "lucide-react"

type SectionGroup = { id: number; name: string } // id -1 = unassigned

export function MealSection({
  group,
  entries,
  dateKey,
  foods,
  allGroups,
  onChanged,
}: {
  group: SectionGroup
  entries: EntryDTO[]
  dateKey: string
  foods: FoodDTO[]
  allGroups: MealGroupDTO[]
  onChanged: () => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [, startTransition] = useTransition()
  const isReal = group.id !== -1

  const groupCalories = entries.reduce((sum, e) => sum + e.calories * e.quantity, 0)
  const groupProtein = entries.reduce((sum, e) => sum + e.protein * e.quantity, 0)

  function changeQty(entry: EntryDTO, next: number) {
    const q = Math.max(0.5, round(next, 2))
    startTransition(async () => {
      await updateEntryQuantity(entry.id, q)
      onChanged()
    })
  }

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
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-base">{group.name}</CardTitle>
          {entries.length > 0 && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(groupCalories)} kcal · {round(groupProtein)}g protein
            </span>
          )}
        </div>
        {isReal && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            {isReal ? "Nothing logged yet." : "Items whose meal group was removed."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Apple className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(entry.calories * entry.quantity)} kcal ·{" "}
                    {round(entry.protein * entry.quantity)}g protein
                  </p>
                </div>
                <div className="flex items-center gap-0.5 rounded-md border border-border">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="Decrease servings"
                    onClick={() => changeQty(entry, entry.quantity - 0.5)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{round(entry.quantity, 2)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="Increase servings"
                    onClick={() => changeQty(entry, entry.quantity + 0.5)}
                  >
                    <Plus />
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button size="icon" variant="ghost" className="size-8" aria-label="Item options" />}
                  >
                    <MoreVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      {allGroups
                        .filter((g) => g.id !== entry.mealGroupId)
                        .map((g) => (
                          <DropdownMenuItem key={g.id} onClick={() => move(entry, g)}>
                            Move to {g.name}
                          </DropdownMenuItem>
                        ))}
                      <DropdownMenuItem variant="destructive" onClick={() => remove(entry)}>
                        <Trash2 data-icon="inline-start" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
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
