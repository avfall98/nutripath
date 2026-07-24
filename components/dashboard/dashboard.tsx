"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { addDays, format, isToday, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
  // Compute "today" only on the client to avoid SSR/client timezone mismatches
  // (the server may be in UTC while the browser is in a different timezone).
  const [dateKey, setDateKey] = useState<string | null>(null)

  useEffect(() => {
    setDateKey(format(new Date(), "yyyy-MM-dd"))
  }, [])

  const { data: entries, isLoading, mutate } = useSWR<EntryDTO[]>(
    dateKey ? ["entries", dateKey] : null,
    () => getEntriesByDate(dateKey!),
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
    const result: Array<{
      id: number
      name: string
      calories: number
      protein: number
      carbs: number
      fat: number
      servingWeightG: number | null
    }> = []
    for (const group of mealGroups) {
      const entries = grouped.byGroup.get(group.id) ?? []
      const groupTotals = entries.reduce(
        (acc, e) => {
          acc.calories += e.calories * e.quantity
          acc.protein += e.protein * e.quantity
          acc.carbs += (e.carbs ?? 0) * e.quantity
          acc.fat += (e.fat ?? 0) * e.quantity
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
      let weightSum = 0
      let hasWeight = false
      for (const e of entries) {
        const food = e.foodId != null ? foods.find((f) => f.id === e.foodId) : null
        const weight = parseServingWeight(food?.servingSize)
        if (weight != null) {
          weightSum += weight * e.quantity
          hasWeight = true
        }
      }
      if (groupTotals.calories > 0 || groupTotals.protein > 0) {
        result.push({
          id: group.id,
          name: group.name,
          calories: groupTotals.calories,
          protein: groupTotals.protein,
          carbs: groupTotals.carbs,
          fat: groupTotals.fat,
          servingWeightG: hasWeight ? weightSum : null,
        })
      }
    }
    return result
  }, [grouped, mealGroups, foods])

  if (!dateKey) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const parsed = parseISO(dateKey)
  const eyebrow = `${format(parsed, "EEEE, MMM d").toUpperCase()} · ${isToday(parsed) ? "TODAY" : format(parsed, "yyyy").toUpperCase()}`

  function shiftDay(days: number) {
    setDateKey(format(addDays(parsed, days), "yyyy-MM-dd"))
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        {/* Desktop: eyebrow + title + round nav arrows */}
        <div className="hidden items-start justify-between gap-4 md:flex">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">{eyebrow}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.8px] text-balance">Today&apos;s Nutrition</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDay(-1)}
              aria-label="Previous day"
              className="flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              aria-label="Next day"
              className="flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        {/* Mobile: title + day navigator pill */}
        <div className="flex flex-col gap-4 md:hidden">
          <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance">Today&apos;s Nutrition</h1>
          <DayNavigator date={dateKey} onDateChange={setDateKey} />
        </div>
      </header>

      <DaySummary
        totals={totals}
        targetCalories={profile?.targetCalories ?? null}
        targetProtein={profile?.targetProtein ?? null}
        mealGroups={mealGroupNutrition}
        servingWeightG={totalServingWeight}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[.07em] text-faint">Meals</h2>
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
