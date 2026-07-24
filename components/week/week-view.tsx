"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameWeek,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getEntriesInRange } from "@/app/actions/entries"
import type { EntryDTO, ProfileDTO } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { round } from "@/lib/format"
import { MacroBadges } from "@/components/dashboard/macro-badges"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"

const KJ_PER_KCAL = 4.184

type DayTotals = {
  date: Date
  key: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  weightG: number
  entries: number
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
      let weightG = 0
      for (const e of dayEntries) {
        const q = e.quantity || 1
        kcal += (e.calories / KJ_PER_KCAL) * q
        protein += e.protein * q
        carbs += (e.carbs ?? 0) * q
        fat += (e.fat ?? 0) * q
        if (e.servingWeightG) weightG += e.servingWeightG * q
      }
      return { date, key, kcal, protein, carbs, fat, weightG, entries: dayEntries.length }
    })
  }, [days, entries])

  const loggedDays = byDay.filter((d) => d.entries > 0)
  const totals = useMemo(
    () =>
      loggedDays.reduce(
        (acc, d) => ({
          kcal: acc.kcal + d.kcal,
          protein: acc.protein + d.protein,
          carbs: acc.carbs + d.carbs,
          fat: acc.fat + d.fat,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [loggedDays],
  )
  const n = loggedDays.length || 1
  const avg = {
    kcal: totals.kcal / n,
    protein: totals.protein / n,
    carbs: totals.carbs / n,
    fat: totals.fat / n,
  }

  const calTarget = profile.targetCalories ?? null
  const proteinTarget = profile.targetProtein ?? null
  const ofTargetCal = calTarget ? Math.round((avg.kcal / calTarget) * 100) : null
  const ofTargetProtein = proteinTarget ? Math.round((avg.protein / proteinTarget) * 100) : null

  const today = new Date()
  const isThisWeek = isSameWeek(anchor, today, { weekStartsOn: 1 })
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const rangeLabel = `${format(weekStart, "MMM d")} – ${sameMonth ? format(weekEnd, "d") : format(weekEnd, "MMM d")}`

  // Independent scales so a day that hits its goal reaches its own target line.
  const calMax = Math.max(calTarget ?? 0, ...byDay.map((d) => d.kcal), 1) * 1.12
  const proteinMax = Math.max(proteinTarget ?? 0, ...byDay.map((d) => d.protein), 1) * 1.28
  const anyOver = calTarget != null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Weekly Nutrition</h1>
          <p className="text-sm text-muted-foreground">Your totals, averages, and day-by-day breakdown.</p>
        </div>
        <div className="flex items-center justify-between gap-1 rounded-2xl bg-card px-2 py-1.5 md:w-[340px]">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full text-muted-foreground"
            onClick={() => setAnchor((a) => addWeeks(a, -1))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm font-bold tabular-nums">
            <span>{rangeLabel}</span>
            {isThisWeek ? <span className="font-semibold text-primary">This week</span> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full text-muted-foreground"
            onClick={() => setAnchor((a) => addWeeks(a, 1))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <Card className="gap-0 p-5 sm:p-6">
        {/* Stat columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-6">
          <StatColumn
            label="Calories"
            labelColor="text-stat-calories"
            value={Math.round(totals.kcal).toLocaleString()}
            caption="kcal this week"
            avgValue={Math.round(avg.kcal).toLocaleString()}
            ofTarget={ofTargetCal}
          />
          <StatColumn
            label="Protein"
            labelColor="text-stat-protein"
            value={Math.round(totals.protein).toLocaleString()}
            unit="g"
            caption="total this week"
            avgValue={`${Math.round(avg.protein)}g`}
            ofTarget={ofTargetProtein}
            withDivider
          />
          <StatColumn
            label="Carbs"
            labelColor="text-stat-carbs"
            value={Math.round(totals.carbs).toLocaleString()}
            unit="g"
            caption="total this week"
            avgValue={`${Math.round(avg.carbs)}g`}
            ofTarget={null}
            withDivider
          />
          <StatColumn
            label="Fat"
            labelColor="text-stat-fat"
            value={Math.round(totals.fat).toLocaleString()}
            unit="g"
            caption="total this week"
            avgValue={`${Math.round(avg.fat)}g`}
            ofTarget={null}
            withDivider
          />
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <LegendDot className="bg-primary" label="Calories" />
          <LegendDot className="bg-cal-over" label="Over target" />
          <LegendDot className="bg-protein-bar" label="Protein" />
          <div className="hidden items-center gap-4 md:ml-auto md:flex">
            {calTarget ? (
              <DashLegend colorVar="var(--primary)" label={`${calTarget.toLocaleString()} kcal target`} />
            ) : null}
            {proteinTarget ? (
              <DashLegend colorVar="var(--protein-bar)" label={`${proteinTarget}g protein target`} />
            ) : null}
          </div>
        </div>

        {/* Grouped bar chart */}
        <div className="relative mt-4 h-56 w-full">
          {calTarget ? (
            <TargetLine frac={calTarget / calMax} colorVar="var(--primary)" label={`${calTarget.toLocaleString()} kcal`} />
          ) : null}
          {proteinTarget ? (
            <TargetLine
              frac={proteinTarget / proteinMax}
              colorVar="var(--protein-bar)"
              label={`${proteinTarget}g protein`}
            />
          ) : null}
          <div className="absolute inset-0 grid grid-cols-7">
            {byDay.map((d) => {
              const empty = d.entries === 0
              const over = anyOver && calTarget != null && d.kcal > calTarget * 1.05
              const isToday = isSameDay(d.date, today)
              const calH = empty ? 1.5 : Math.max(4, Math.min(100, (d.kcal / calMax) * 100))
              const proH = empty ? 1.5 : Math.max(4, Math.min(100, (d.protein / proteinMax) * 100))
              const calColor = empty ? "var(--track)" : over ? "var(--cal-over)" : "var(--primary)"
              const proColor = empty ? "var(--track)" : "var(--protein-bar)"
              return (
                <div key={d.key} className="flex items-end justify-center gap-1 sm:gap-1.5">
                  <span
                    className="w-2.5 rounded-t-md sm:w-3.5"
                    style={{ height: `${calH}%`, backgroundColor: calColor, opacity: isToday && !empty ? 0.6 : 1 }}
                    title={`${Math.round(d.kcal)} kcal`}
                  />
                  <span
                    className="w-2.5 rounded-t-md sm:w-3.5"
                    style={{ height: `${proH}%`, backgroundColor: proColor, opacity: isToday && !empty ? 0.6 : 1 }}
                    title={`${Math.round(d.protein)}g protein`}
                  />
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-7">
          {byDay.map((d) => {
            const isToday = isSameDay(d.date, today)
            return (
              <span
                key={d.key}
                className={cn(
                  "text-center text-xs font-medium",
                  isToday ? "font-semibold text-primary" : "text-faint",
                )}
              >
                {format(d.date, "EEE")}
              </span>
            )
          })}
        </div>
      </Card>

      {/* Day by day list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint">Days</h2>
        <Card className="gap-0 p-0">
          <ul className="flex flex-col">
            {byDay.map((d) => {
              const empty = d.entries === 0
              const over = calTarget != null && d.kcal > calTarget
              const isToday = isSameDay(d.date, today)
              const fullDay = format(d.date, "EEEE")
              const dateLabel = format(d.date, "MMM d")

              if (empty) {
                return (
                  <li
                    key={d.key}
                    className="flex items-center gap-3 border-t border-border/60 px-5 py-4 first:border-t-0"
                  >
                    <MiniBars empty />
                    <p className="text-sm">
                      <span className="font-bold text-muted-foreground">{fullDay}</span>{" "}
                      <span className="text-faint">
                        {dateLabel} · Nothing logged yet
                      </span>
                    </p>
                  </li>
                )
              }

              const calPct = calTarget ? Math.round((d.kcal / calTarget) * 100) : null
              const proPct = proteinTarget ? Math.round((d.protein / proteinTarget) * 100) : null
              return (
                <li key={d.key} className="border-t border-border/60 first:border-t-0">
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <MiniBars
                      calPct={calTarget ? (d.kcal / calTarget) * 100 : 100}
                      proPct={proteinTarget ? (d.protein / proteinTarget) * 100 : 100}
                      over={over}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{fullDay}</span>
                        <span className="text-sm text-faint">{dateLabel}</span>
                        {isToday ? (
                          <span className="text-xs font-semibold text-primary">Today · in progress</span>
                        ) : over ? (
                          <span className="text-xs font-semibold text-cal-over">
                            +{Math.round(d.kcal - (calTarget ?? 0))} over
                          </span>
                        ) : null}
                        <ChevronRight className="ml-auto size-4 shrink-0 text-faint" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <MacroBadges
                          kcal={Math.round(d.kcal)}
                          kcalPct={calPct}
                          protein={d.protein}
                          proteinPct={proPct}
                          carbs={d.carbs}
                          fat={d.fat}
                        />
                        <div className="flex items-center gap-1.5">
                          <ProteinScoreBadges proteinG={d.protein} kcal={d.kcal} />
                          <CalorieDensityBadge
                            kcal={d.kcal}
                            servingSize={d.weightG > 0 ? String(round(d.weightG, 0)) : null}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {pending && entries.length === 0 ? (
        <p className="text-center text-sm text-faint">Loading week…</p>
      ) : null}
    </div>
  )
}

function StatColumn({
  label,
  labelColor,
  value,
  unit,
  caption,
  avgValue,
  ofTarget,
  withDivider = false,
}: {
  label: string
  labelColor: string
  value: string
  unit?: string
  caption: string
  avgValue: string
  ofTarget: number | null
  withDivider?: boolean
}) {
  return (
    <div className={cn("flex flex-col", withDivider && "md:border-l md:border-border/60 md:pl-6")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[.07em]", labelColor)}>{label}</p>
      <p className="mt-1.5 text-3xl font-bold leading-none tabular-nums">
        {value}
        {unit ? <span className="text-lg font-semibold text-faint">{unit}</span> : null}
      </p>
      <p className="mt-1.5 text-xs text-faint">{caption}</p>
      {/* Desktop: stacked rows */}
      <div className="mt-3 hidden flex-col gap-1 md:flex">
        <div className="flex items-center justify-between text-sm">
          <span className="text-faint">Avg / day</span>
          <span className="font-semibold tabular-nums">{avgValue}</span>
        </div>
        {ofTarget != null ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-faint">Of target</span>
            <span className="font-semibold tabular-nums text-primary">{ofTarget}%</span>
          </div>
        ) : null}
      </div>
      {/* Mobile: inline caption */}
      <p className="mt-1 text-xs text-faint md:hidden">
        avg {avgValue}/day
        {ofTarget != null ? (
          <>
            {" · "}
            <span className="font-semibold text-primary">{ofTarget}%</span>
          </>
        ) : null}
      </p>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
      {label}
    </span>
  )
}

function DashLegend({ colorVar, label }: { colorVar: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: colorVar }} aria-hidden />
      {label}
    </span>
  )
}

function TargetLine({ frac, colorVar, label }: { frac: number; colorVar: string; label: string }) {
  const bottom = Math.min(100, Math.max(0, frac * 100))
  return (
    <div className="pointer-events-none absolute inset-x-0" style={{ bottom: `${bottom}%` }} aria-hidden>
      <div className="h-0 w-full border-t border-dashed" style={{ borderColor: colorVar }} />
      <span
        className="absolute right-0 top-1 text-[11px] font-semibold"
        style={{ color: colorVar }}
      >
        {label}
      </span>
    </div>
  )
}

function MiniBars({
  calPct = 0,
  proPct = 0,
  over = false,
  empty = false,
}: {
  calPct?: number
  proPct?: number
  over?: boolean
  empty?: boolean
}) {
  const calFill = empty ? 0 : Math.max(8, Math.min(100, calPct))
  const proFill = empty ? 0 : Math.max(8, Math.min(100, proPct))
  return (
    <div className="flex h-10 shrink-0 items-end gap-1">
      <span className="relative flex h-full w-1.5 items-end overflow-hidden rounded-full bg-track">
        {!empty ? (
          <span
            className="w-full rounded-full"
            style={{ height: `${calFill}%`, backgroundColor: over ? "var(--cal-over)" : "var(--primary)" }}
          />
        ) : null}
      </span>
      <span className="relative flex h-full w-1.5 items-end overflow-hidden rounded-full bg-track">
        {!empty ? (
          <span
            className="w-full rounded-full"
            style={{ height: `${proFill}%`, backgroundColor: "var(--protein-bar)" }}
          />
        ) : null}
      </span>
    </div>
  )
}
