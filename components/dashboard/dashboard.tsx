"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { getEntriesByDate } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO, ProfileDTO } from "@/lib/types"
import { DaySummary } from "@/components/dashboard/day-summary"
import { DayNavigator } from "@/components/dashboard/day-navigator"
import { MealSection } from "@/components/dashboard/meal-section"
import { Skeleton } from "@/components/ui/skeleton"

export function Dashboard({
  profile,
  mealGroups,
  foods,
}: {
  profile: ProfileDTO | null
  mealGroups: MealGroupDTO[]
  foods: FoodDTO[]
}) {
  const [dateKey, setDateKey] = useState(() => format(new Date(), "yyyy-MM-dd"))

  const { data: entries, isLoading, mutate } = useSWR<EntryDTO[]>(
    ["entries", dateKey],
    () => getEntriesByDate(dateKey),
    { keepPreviousData: true },
  )

  const list = entries ?? []

  const totals = useMemo(() => {
    return list.reduce(
      (acc, e) => {
        acc.calories += e.calories * e.quantity
        acc.protein += e.protein * e.quantity
        acc.carbs += (e.carbs ?? 0) * e.quantity
        acc.fat += (e.fat ?? 0) * e.quantity
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [list])

  // Group entries by meal group, plus an "unassigned" bucket for orphaned items.
  const grouped = useMemo(() => {
    const byGroup = new Map<number, EntryDTO[]>()
    for (const g of mealGroups) byGroup.set(g.id, [])
    const orphans: EntryDTO[] = []
    for (const e of list) {
      if (e.mealGroupId != null && byGroup.has(e.mealGroupId)) {
        byGroup.get(e.mealGroupId)!.push(e)
      } else {
        orphans.push(e)
      }
    }
    return { byGroup, orphans }
  }, [list, mealGroups])

  return (
    <div className="flex flex-col gap-6">
      <DayNavigator date={dateKey} onDateChange={setDateKey} />

      <DaySummary
        totals={totals}
        targetCalories={profile?.targetCalories ?? null}
        targetProtein={profile?.targetProtein ?? null}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Meals</h2>
        {isLoading && !entries ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mealGroups.map((g) => (
              <MealSection
                key={g.id}
                group={{ id: g.id, name: g.name }}
                entries={grouped.byGroup.get(g.id) ?? []}
                dateKey={dateKey}
                foods={foods}
                allGroups={mealGroups}
                onChanged={() => mutate()}
              />
            ))}
            {grouped.orphans.length > 0 && (
              <MealSection
                group={{ id: -1, name: "Unassigned" }}
                entries={grouped.orphans}
                dateKey={dateKey}
                foods={foods}
                allGroups={mealGroups}
                onChanged={() => mutate()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
