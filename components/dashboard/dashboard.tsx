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
import { parseServingWeight } from "@/lib/nutrition"

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

  // Total serving weight across the day, summed from each entry's food serving size.
  const totalServingWeight = useMemo(() => {
    let sum = 0
    let hasAny = false
    for (const e of list) {
      const food = e.foodId != null ? foods.find((f) => f.id === e.foodId) : null
      const weight = parseServingWeight(food?.servingSize)
      if (weight != null) {
        sum += weight * e.quantity
        hasAny = true
      }
    }
    return hasAny ? sum : null
  }, [list, foods])

  const mealGroupNutrition = useMemo(() => {
    const result: Array<{ id: number; name: string; calories: number; protein: number }> = []
    for (const group of mealGroups) {
      const entries = grouped.byGroup.get(group.id) ?? []
      const groupTotals = entries.reduce(
        (acc, e) => {
          acc.calories += e.calories * e.quantity
          acc.protein += e.protein * e.quantity
          return acc
        },
        { calories: 0, protein: 0 },
      )
      if (groupTotals.calories > 0 || groupTotals.protein > 0) {
        result.push({
          id: group.id,
          name: group.name,
          calories: groupTotals.calories,
          protein: groupTotals.protein,
        })
      }
    }
    return result
  }, [grouped, mealGroups])

  return (
    <div className="flex flex-col gap-6">
      <DayNavigator date={dateKey} onDateChange={setDateKey} />

      <DaySummary
        totals={totals}
        targetCalories={profile?.targetCalories ?? null}
        targetProtein={profile?.targetProtein ?? null}
        mealGroups={mealGroupNutrition}
        servingWeightG={totalServingWeight}
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
                targetCalories={profile?.targetCalories ?? null}
                targetProtein={profile?.targetProtein ?? null}
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
                targetCalories={profile?.targetCalories ?? null}
                targetProtein={profile?.targetProtein ?? null}
                onChanged={() => mutate()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
