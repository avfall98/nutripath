"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getEntriesInRange } from "@/app/actions/entries"
import type { EntryDTO, ProfileDTO } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const KJ_PER_KCAL = 4.184

type DayTotals = {
  date: Date
  key: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  entries: number
}

function macroKcal(protein: number, carbs: number, fat: number) {
  return protein * 4 + carbs * 4 + fat * 9
}

export function WeekView({ profile }: { profile: ProfileDTO }) {
  const [anchor, setAnchor] = useState(() => new Date())
  const [entries, setEntries] = useState<EntryDTO[]>([])
  const [pending, startTransition] = useTransition()

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  useEffect(() => {
    const startKey = format(weekStart, "yyyy-MM-dd")
    const endKey = format(weekEnd, "yyyy-MM-dd")
    startTransition(async () => {
      const rows = await getEntriesInRange(startKey, endKey)
      setEntries(rows)
    })
  }, [weekStart, weekEnd])

  const byDay = useMemo<DayTotals[]>(() => {
    return days.map((date) => {
      const key = format(date, "yyyy-MM-dd")
      const dayEntries = entries.filter((e) => e.entryDate === key)
      let kcal = 0
      let protein = 0
      let carbs = 0
      let fat = 0
      for (const e of dayEntries) {
        const q = e.quantity || 1
        kcal += (e.calories / KJ_PER_KCAL) * q
        protein += e.protein * q
        carbs += (e.carbs ?? 0) * q
        fat += (e.fat ?? 0) * q
      }
      return { date, key, kcal, protein, carbs, fat, entries: dayEntries.length }
    })
  }, [days, entries])

  const loggedDays = byDay.filter((d) => d.entries > 0)
  const avg = useMemo(() => {
    if (loggedDays.length === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    const sum = loggedDays.reduce(
      (acc, d) => ({
        kcal: acc.kcal + d.kcal,
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
    return {
      kcal: sum.kcal / loggedDays.length,
      protein: sum.protein / loggedDays.length,
      carbs: sum.carbs / loggedDays.length,
      fat: sum.fat / loggedDays.length,
    }
  }, [loggedDays])

  const calTargetKcal = profile.targetCalories ?? null
  const proteinTarget = profile.targetProtein ?? null

  const maxKcal = Math.max(calTargetKcal ?? 0, ...byDay.map((d) => d.kcal), 1)
  const today = new Date()
  const rangeLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[21px] font-bold tracking-tight">This Week</h1>
          <p className="hidden text-sm text-muted-foreground md:block">
            Your daily intake and weekly averages.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-card p-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setAnchor((a) => addWeeks(a, -1))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[132px] text-center text-sm font-medium tabular-nums">{rangeLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setAnchor((a) => addWeeks(a, 1))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AverageStat label="Avg calories" value={Math.round(avg.kcal)} unit="kcal" tone="text-foreground" />
        <AverageStat label="Avg protein" value={Math.round(avg.protein)} unit="g" tone="text-protein" />
        <AverageStat label="Avg carbs" value={Math.round(avg.carbs)} unit="g" tone="text-carbs" />
        <AverageStat label="Avg fat" value={Math.round(avg.fat)} unit="g" tone="text-fat" />
      </section>

      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[.07em] text-faint">Daily calories</h2>
          {calTargetKcal ? (
            <span className="text-xs text-faint">Target {calTargetKcal.toLocaleString()} kcal</span>
          ) : null}
        </div>
        <div className="grid grid-cols-7 gap-2 px-4 pb-5 pt-6 sm:gap-3 sm:px-5">
          {byDay.map((d) => {
            const pct = maxKcal > 0 ? Math.min(100, (d.kcal / maxKcal) * 100) : 0
            const targetPct = calTargetKcal ? Math.min(100, (calTargetKcal / maxKcal) * 100) : null
            const isToday = isSameDay(d.date, today)
            const over = calTargetKcal ? d.kcal > calTargetKcal * 1.05 : false
            return (
              <div key={d.key} className="flex flex-col items-center gap-2">
                <div className="relative flex h-32 w-full items-end justify-center">
                  {targetPct != null ? (
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-border"
                      style={{ bottom: `${targetPct}%` }}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`w-full max-w-8 rounded-md transition-[height] ${
                      d.entries === 0 ? "bg-muted" : over ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ height: `${Math.max(pct, d.entries > 0 ? 6 : 3)}%` }}
                    title={`${Math.round(d.kcal)} kcal`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium ${isToday ? "text-primary" : "text-faint"}`}
                >
                  {format(d.date, "EEEEE")}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {d.entries === 0 ? "–" : Math.round(d.kcal)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="gap-0 p-0">
        <h2 className="px-5 pt-5 text-[11px] font-semibold uppercase tracking-[.07em] text-faint">
          Day by day
        </h2>
        <ul className="mt-2 flex flex-col">
          {byDay.map((d) => {
            const proteinPct = proteinTarget ? Math.min(100, (d.protein / proteinTarget) * 100) : 0
            return (
              <li
                key={d.key}
                className="flex items-center gap-4 border-t border-border/60 px-5 py-3 first:border-t-0"
              >
                <div className="w-14 shrink-0">
                  <p className="text-sm font-medium">{format(d.date, "EEE")}</p>
                  <p className="text-xs text-faint">{format(d.date, "MMM d")}</p>
                </div>
                {d.entries === 0 ? (
                  <p className="flex-1 text-sm text-faint">No entries</p>
                ) : (
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold tabular-nums">
                          {Math.round(d.kcal).toLocaleString()}
                          <span className="ml-0.5 text-xs font-normal text-faint">kcal</span>
                        </span>
                        {proteinTarget ? (
                          <span className="text-xs tabular-nums text-faint">
                            {Math.round(d.protein)}g / {proteinTarget}g protein
                          </span>
                        ) : (
                          <span className="text-xs tabular-nums text-faint">{Math.round(d.protein)}g protein</span>
                        )}
                      </div>
                      {proteinTarget ? (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-protein" style={{ width: `${proteinPct}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {pending && entries.length === 0 ? (
        <p className="text-center text-sm text-faint">Loading week…</p>
      ) : null}
    </div>
  )
}

function AverageStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: number
  unit: string
  tone: string
}) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[.05em] text-faint">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-normal text-faint">{unit}</span>
      </p>
    </Card>
  )
}
