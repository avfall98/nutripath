"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import useSWR from "swr"
import { addDays, format, isToday, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, MoreHorizontal, CalendarOff, RotateCcw } from "lucide-react"
import { getEntriesByDate, isDaySkipped, setDaySkipped } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO, MealGroupDTO, ProfileDTO } from "@/lib/types"
import { DaySummary } from "@/components/dashboard/day-summary"
import { DayNavigator } from "@/components/dashboard/day-navigator"
import { MealSection } from "@/components/dashboard/meal-section"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  const { data: skipped, mutate: mutateSkipped } = useSWR<boolean>(
    dateKey ? ["day-skipped", dateKey] : null,
    () => isDaySkipped(dateKey!),
    { keepPreviousData: true },
  )
  const isSkipped = skipped ?? false

  const [, startSkipTransition] = useTransition()

  function toggleSkipped() {
    if (!dateKey) return
    const next = !isSkipped
    // Optimistically flip the UI, then persist.
    mutateSkipped(next, { revalidate: false })
    startSkipTransition(async () => {
      await setDaySkipped(dateKey, next)
      mutateSkipped()
    })
  }

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

  const dayMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Day options"
        className="flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-white data-[popup-open]:bg-card-hover data-[popup-open]:text-white"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={toggleSkipped}>
          {isSkipped ? <RotateCcw /> : <CalendarOff />}
          <span className="flex flex-col">
            <span className="font-medium">{isSkipped ? "Include this day" : "Skip this day"}</span>
            <span className="text-xs text-muted-foreground">
              {isSkipped ? "Count it in weekly totals" : "Exclude from weekly totals"}
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

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
            <div className="ml-1">{dayMenu}</div>
          </div>
        </div>
        {/* Mobile: title + day navigator pill */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance">Today&apos;s Nutrition</h1>
            {dayMenu}
          </div>
          <DayNavigator date={dateKey} onDateChange={setDateKey} />
        </div>
      </header>

      {isSkipped ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-card-hover text-muted-foreground">
            <CalendarOff className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold">Day skipped</p>
            <p className="max-w-md text-pretty text-sm text-muted-foreground">
              This day isn&apos;t counting toward your weekly totals. Any food you&apos;ve logged is saved
              and will reappear as soon as you include the day again.
            </p>
            {list.length > 0 ? (
              <p className="mt-1 text-xs text-faint">
                {list.length} {list.length === 1 ? "entry" : "entries"} hidden
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={toggleSkipped}
            className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            <RotateCcw className="size-4" />
            Include this day
          </button>
        </div>
      ) : (
        <>
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
          <div className="flex flex-col gap-7">
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
        </>
      )}
    </div>
  )
}
