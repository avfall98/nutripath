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
import { cn } from "@/lib/utils"
import { round } from "@/lib/format"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { PageLoading } from "@/components/page-loading"

const KJ_PER_KCAL = 4.184

  const ROW_GRID = "grid grid-cols-[40px_1fr_120px_112px_60px_60px_132px_20px] items-center gap-x-3"
  const FOOD_ROW_GRID = "grid grid-cols-[1fr_60px_90px_120px_112px_60px_60px] items-center gap-x-3"

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

type FoodTotals = {
  key: string
  name: string
  count: number
  weightG: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export function WeekView({ profile }: { profile: ProfileDTO }) {
  const [anchor, setAnchor] = useState(() => new Date())
  const [entries, setEntries] = useState<EntryDTO[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [, startTransition] = useTransition()

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  useEffect(() => {
    const startKey = format(weekStart, "yyyy-MM-dd")
    const endKey = format(weekEnd, "yyyy-MM-dd")
    startTransition(async () => {
      const rows = await getEntriesInRange(startKey, endKey)
      setEntries(rows)
      setHasLoaded(true)
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

  const topFoods = useMemo<FoodTotals[]>(() => {
    const map = new Map<string, FoodTotals>()
    for (const e of entries) {
      const key = e.foodId != null ? `food-${e.foodId}` : `name-${e.name.trim().toLowerCase()}`
      const q = e.quantity || 1
      const kcal = (e.calories / KJ_PER_KCAL) * q
      const protein = e.protein * q
      const carbs = (e.carbs ?? 0) * q
      const fat = (e.fat ?? 0) * q
      const weight = e.servingWeightG ? e.servingWeightG * q : 0
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        existing.weightG += weight
        existing.kcal += kcal
        existing.protein += protein
        existing.carbs += carbs
        existing.fat += fat
      } else {
        map.set(key, { key, name: e.name, count: 1, weightG: weight, kcal, protein, carbs, fat })
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.kcal - a.kcal).slice(0, 10)
  }, [entries])

  const calTarget = profile.targetCalories ?? null
  const proteinTarget = profile.targetProtein ?? null
  const ofTargetCal = calTarget ? Math.round((avg.kcal / calTarget) * 100) : null
  const ofTargetProtein = proteinTarget ? Math.round((avg.protein / proteinTarget) * 100) : null

  const today = new Date()
  const isThisWeek = isSameWeek(anchor, today, { weekStartsOn: 1 })
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const rangeLabel = `${format(weekStart, "MMM d")} – ${sameMonth ? format(weekEnd, "d") : format(weekEnd, "MMM d")}`
  const eyebrow = `${rangeLabel.toUpperCase()} · ${isThisWeek ? "THIS WEEK" : format(weekStart, "yyyy")}`

  const calMax = Math.max(calTarget ?? 0, ...byDay.map((d) => d.kcal), 1) * 1.12
  const proteinMax = Math.max(proteinTarget ?? 0, ...byDay.map((d) => d.protein), 1) * 1.28
  const anyOver = calTarget != null

  const statCards = [
    {
      label: "Calories",
      color: "var(--stat-calories)",
      value: Math.round(avg.kcal).toLocaleString(),
      unit: "",
      caption: `${Math.round(totals.kcal).toLocaleString()} total`,
      ofTarget: ofTargetCal,
    },
    {
      label: "Protein",
      color: "var(--stat-protein)",
      value: Math.round(avg.protein).toLocaleString(),
      unit: "g",
      caption: `${Math.round(totals.protein).toLocaleString()}g total`,
      ofTarget: ofTargetProtein,
    },
    {
      label: "Carbs",
      color: "var(--stat-carbs)",
      value: Math.round(avg.carbs).toLocaleString(),
      unit: "g",
      caption: `${Math.round(totals.carbs).toLocaleString()}g total`,
      ofTarget: null as number | null,
    },
    {
      label: "Fat",
      color: "var(--stat-fat)",
      value: Math.round(avg.fat).toLocaleString(),
      unit: "g",
      caption: `${Math.round(totals.fat).toLocaleString()}g total`,
      ofTarget: null as number | null,
    },
  ]

  function chart() {
    return (
      <>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <LegendDot className="bg-primary" label="Calories" />
          <LegendDot className="bg-cal-over" label="Over target" />
          <LegendDot className="bg-protein-bar" label="Protein" />
          <div className="hidden items-center gap-4 md:ml-auto md:flex">
            {calTarget ? <DashLegend colorVar="var(--primary)" label={`${calTarget.toLocaleString()} kcal target`} /> : null}
            {proteinTarget ? <DashLegend colorVar="var(--protein-bar)" label={`${proteinTarget}g protein target`} /> : null}
          </div>
        </div>

        <div className="relative mt-4 h-56 w-full">
          {calTarget ? (
            <TargetLine frac={calTarget / calMax} colorVar="var(--primary)" label={`${calTarget.toLocaleString()} kcal`} />
          ) : null}
          {proteinTarget ? (
            <TargetLine frac={proteinTarget / proteinMax} colorVar="var(--protein-bar)" label={`${proteinTarget}g protein`} />
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
                className={cn("text-center text-xs font-medium", isToday ? "font-bold text-primary" : "text-faint")}
              >
                {format(d.date, "EEE")}
              </span>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        {/* Desktop */}
        <div className="hidden items-start justify-between gap-4 md:flex">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">{eyebrow}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.8px] text-balance">Weekly Nutrition</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchor((a) => addWeeks(a, -1))}
              aria-label="Previous week"
              className="flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor((a) => addWeeks(a, 1))}
              aria-label="Next week"
              className="flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        {/* Mobile */}
        <div className="flex flex-col gap-4 md:hidden">
          <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance">Weekly Nutrition</h1>
          <div className="flex items-center justify-between gap-1 rounded-lg bg-card px-2 py-1.5">
            <button
              type="button"
              onClick={() => setAnchor((a) => addWeeks(a, -1))}
              aria-label="Previous week"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2 text-sm font-bold tabular-nums">
              <span>{rangeLabel}</span>
              {isThisWeek ? <span className="font-semibold text-primary">This week</span> : null}
            </div>
            <button
              type="button"
              onClick={() => setAnchor((a) => addWeeks(a, 1))}
              aria-label="Next week"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {!hasLoaded ? (
        <PageLoading label="Loading your week…" />
      ) : (
      <>
      {/* Desktop: 4 stat cards */}
      <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">
        {statCards.map((s, idx) => (
          <div key={s.label} className="rounded-lg bg-card p-5 transition-colors hover:bg-card-hover">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: s.color }}>
                {s.label}
              </p>
              {idx === 1 && (
                <ProteinScoreBadges proteinG={totals.protein} kcal={totals.kcal} size="sm" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="text-3xl font-extrabold tabular-nums leading-none">
                {s.value}
              </p>
              {s.unit ? <span className="text-sm font-semibold text-faint">{s.unit}</span> : null}
              <span className="text-sm font-medium text-faint">/ day</span>
              {s.ofTarget != null ? (
                <span className="text-sm font-bold text-primary">{s.ofTarget}%</span>
              ) : null}
            </div>
            {s.caption ? (
              <p className="mt-1 text-xs text-faint">{s.caption}</p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Desktop: chart card */}
      <Card className="hidden p-6 md:block">{chart()}</Card>

      {/* Mobile: combined stats + chart card */}
      <Card className="gap-0 border-0 bg-transparent p-0 md:border md:bg-card md:p-5 md:hidden">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {statCards.map((s, i) => (
            <div key={s.label} className={cn("flex flex-col", i % 2 === 1 && "border-l border-border pl-4")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[.07em]" style={{ color: s.color }}>
                  {s.label}
                </p>
                {i === 1 && (
                  <ProteinScoreBadges proteinG={totals.protein} kcal={totals.kcal} size="sm" />
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <p className="text-2xl font-extrabold leading-none tabular-nums">
                  {s.value}
                </p>
                {s.unit ? <span className="text-base font-semibold text-faint">{s.unit}</span> : null}
                <span className="text-xs text-faint">/ day</span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-1 text-xs text-faint">
                <span>{s.caption}</span>
                {s.ofTarget != null ? (
                  <>
                    <span>·</span>
                    <span className="font-bold text-primary">{s.ofTarget}%</span>
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">{chart()}</div>
      </Card>

      {/* Day by day */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[.08em] text-faint">Days</h2>

        {/* Desktop table */}
        <div className="hidden flex-col md:flex">
          <div
            className={cn(
              ROW_GRID,
              "border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint",
            )}
          >
            <span />
            <span>Day</span>
            <span>Kcal</span>
            <span>Protein</span>
            <span>Carbs</span>
            <span>Fat</span>
            <span className="text-right">Scores</span>
            <span />
          </div>
          <ul className="mt-1 flex flex-col">
            {byDay.map((d) => {
              const empty = d.entries === 0
              const over = calTarget != null && d.kcal > calTarget
              const isToday = isSameDay(d.date, today)
              const fullDay = format(d.date, "EEEE")
              const dateLabel = format(d.date, "MMM d")
              const calPct = calTarget ? Math.round((d.kcal / calTarget) * 100) : null
              const proPct = proteinTarget ? Math.round((d.protein / proteinTarget) * 100) : null

              if (empty) {
                return (
                  <li key={d.key} className={cn(ROW_GRID, "rounded-[4px] px-2 py-3")}>
                    <MiniBars empty />
                    <span className="text-sm">
                      <span className="font-bold text-muted-foreground">{fullDay}</span>{" "}
                      <span className="text-faint">{dateLabel} · Nothing logged yet</span>
                    </span>
                    <span className="col-span-6" />
                  </li>
                )
              }

              return (
                <li key={d.key} className={cn(ROW_GRID, "rounded-[4px] px-2 py-3 hover:bg-white/[0.08]")}>
                  <MiniBars
                    calPct={calTarget ? (d.kcal / calTarget) * 100 : 100}
                    proPct={proteinTarget ? (d.protein / proteinTarget) * 100 : 100}
                    over={over}
                  />
                  <Link href="/" className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{fullDay}</span>
                      {isToday ? (
                        <span className="text-xs font-semibold text-primary">Today</span>
                      ) : over ? (
                        <span className="text-xs font-semibold text-cal-over">
                          +{Math.round(d.kcal - (calTarget ?? 0))} over
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-faint">{dateLabel}</span>
                  </Link>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="calories" />
                    {Math.round(d.kcal)}
                    {calPct != null ? <span className="font-normal text-faint">({calPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="protein" />
                    {Math.round(d.protein)}
                    {proPct != null ? <span className="font-normal text-faint">({proPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="carbs" />
                    {Math.round(d.carbs)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="fat" />
                    {Math.round(d.fat)}
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    <ProteinScoreBadges proteinG={d.protein} kcal={d.kcal} />
                    <CalorieDensityBadge kcal={d.kcal} servingSize={d.weightG > 0 ? String(round(d.weightG, 0)) : null} />
                  </div>
                  <ChevronRight className="size-4 justify-self-end text-faint" />
                </li>
              )
            })}
          </ul>
        </div>

        {/* Mobile stacked list */}
        <Card className="gap-0 border-0 bg-transparent p-0 md:border md:bg-card md:hidden">
          <ul className="flex flex-col">
            {byDay.map((d) => {
              const empty = d.entries === 0
              const over = calTarget != null && d.kcal > calTarget
              const isToday = isSameDay(d.date, today)
              const fullDay = format(d.date, "EEEE")
              const dateLabel = format(d.date, "MMM d")

              if (empty) {
                return (
                  <li key={d.key} className="flex items-center gap-3 border-t border-border/60 px-5 py-4 first:border-t-0">
                    <MiniBars empty />
                    <p className="text-sm">
                      <span className="font-bold text-muted-foreground">{fullDay}</span>{" "}
                      <span className="text-faint">{dateLabel} · Nothing logged yet</span>
                    </p>
                  </li>
                )
              }

              const calPct = calTarget ? Math.round((d.kcal / calTarget) * 100) : null
              const proPct = proteinTarget ? Math.round((d.protein / proteinTarget) * 100) : null
              return (
                <li key={d.key} className="border-t border-border/60 first:border-t-0">
                  <Link href="/" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.06]">
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
                          <span className="text-xs font-semibold text-primary">Today</span>
                        ) : over ? (
                          <span className="text-xs font-semibold text-cal-over">
                            +{Math.round(d.kcal - (calTarget ?? 0))} over
                          </span>
                        ) : null}
                        <ChevronRight className="ml-auto size-4 shrink-0 text-faint" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <MacroBadges kcal={Math.round(d.kcal)} kcalPct={calPct} protein={d.protein} proteinPct={proPct} carbs={d.carbs} fat={d.fat} />
                        <div className="flex items-center gap-1.5">
                          <ProteinScoreBadges proteinG={d.protein} kcal={d.kcal} />
                          <CalorieDensityBadge kcal={d.kcal} servingSize={d.weightG > 0 ? String(round(d.weightG, 0)) : null} />
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

      {/* Most common foods */}
      {topFoods.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[.08em] text-faint">Most common foods</h2>

          {/* Desktop table */}
          <div className="hidden flex-col md:flex">
            <div
              className={cn(
                FOOD_ROW_GRID,
                "border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint",
              )}
            >
              <span>Food</span>
              <span className="text-right">Times</span>
              <span>Amount</span>
              <span>Kcal</span>
              <span>Protein</span>
              <span>Carbs</span>
              <span>Fat</span>
            </div>
            <ul className="mt-1 flex flex-col">
              {topFoods.map((f) => {
                const kcalPct = totals.kcal > 0 ? Math.round((f.kcal / totals.kcal) * 100) : null
                const proteinPct = totals.protein > 0 ? Math.round((f.protein / totals.protein) * 100) : null
                return (
                  <li key={f.key} className={cn(FOOD_ROW_GRID, "rounded-[4px] px-2 py-3 hover:bg-white/[0.08]")}>
                    <span className="min-w-0 truncate text-sm font-bold">{f.name}</span>
                    <span className="text-right text-[13px] font-bold tabular-nums">
                      {f.count}
                      <span className="font-normal text-faint">×</span>
                    </span>
                    <span className="text-[13px] font-bold tabular-nums text-muted-foreground">
                      {f.weightG > 0 ? `${Math.round(f.weightG).toLocaleString()}g` : "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="calories" />
                      {Math.round(f.kcal).toLocaleString()}
                      {kcalPct != null ? <span className="font-normal text-faint">({kcalPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="protein" />
                      {Math.round(f.protein)}
                      {proteinPct != null ? <span className="font-normal text-faint">({proteinPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="carbs" />
                      {Math.round(f.carbs)}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="fat" />
                      {Math.round(f.fat)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Mobile stacked list */}
          <Card className="gap-0 border-0 bg-transparent p-0 md:border md:bg-card md:hidden">
            <ul className="flex flex-col">
              {topFoods.map((f) => {
                const kcalPct = totals.kcal > 0 ? Math.round((f.kcal / totals.kcal) * 100) : null
                const proteinPct = totals.protein > 0 ? Math.round((f.protein / totals.protein) * 100) : null
                return (
                  <li key={f.key} className="border-t border-border/60 px-5 py-4 first:border-t-0">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-bold">{f.name}</span>
                      <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-faint">
                        {f.count}×{f.weightG > 0 ? ` · ${Math.round(f.weightG).toLocaleString()}g` : ""}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <MacroBadges
                        kcal={Math.round(f.kcal)}
                        kcalPct={kcalPct}
                        protein={f.protein}
                        proteinPct={proteinPct}
                        carbs={f.carbs}
                        fat={f.fat}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      ) : null}
      </>
      )}
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
      <span className="absolute right-0 top-1 text-[11px] font-semibold" style={{ color: colorVar }}>
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
      <span className="relative flex h-full w-[5px] items-end overflow-hidden rounded-full bg-track">
        {!empty ? (
          <span
            className="w-full rounded-full"
            style={{ height: `${calFill}%`, backgroundColor: over ? "var(--cal-over)" : "var(--primary)" }}
          />
        ) : null}
      </span>
      <span className="relative flex h-full w-[5px] items-end overflow-hidden rounded-full bg-track">
        {!empty ? (
          <span className="w-full rounded-full" style={{ height: `${proFill}%`, backgroundColor: "var(--protein-bar)" }} />
        ) : null}
      </span>
    </div>
  )
}
