import { addDays, format, startOfDay } from "date-fns"
import { getEntriesInRange, getSkippedDaysInRange } from "@/app/actions/entries"
import type { EntryDTO } from "@/lib/types"

const KJ_PER_KCAL = 4.184

// How far back to look for replacement days when some days in the window are skipped.
const MAX_LOOKBACK_DAYS = 120

const dateKey = (date: Date) => format(date, "yyyy-MM-dd")

export type DayTotals = { kcal: number; protein: number; carbs: number; fat: number }

export type RollingAverage = {
  /** Number of days that actually had food logged and contributed to the average. */
  loggedDays: number
  totals: DayTotals
  avg: DayTotals
}

/**
 * Walks back from yesterday (today is never counted) and collects the most recent
 * `count` days that are not skipped, so skipped days are replaced by earlier ones.
 */
export function pickAverageDayKeys(count: number, skipped: Set<string>, today = new Date()): string[] {
  const start = startOfDay(today)
  const keys: string[] = []
  for (let offset = 1; offset <= MAX_LOOKBACK_DAYS && keys.length < count; offset++) {
    const key = dateKey(addDays(start, -offset))
    if (!skipped.has(key)) keys.push(key)
  }
  return keys
}

/** Sums entries per day for the given day keys and averages over days that have entries. */
export function averageForDays(entries: EntryDTO[], dayKeys: Iterable<string>): RollingAverage {
  const allowed = new Set(dayKeys)
  const byDay = new Map<string, DayTotals>()
  for (const e of entries) {
    if (!allowed.has(e.entryDate)) continue
    const q = e.quantity || 1
    const day = byDay.get(e.entryDate) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    day.kcal += (e.calories / KJ_PER_KCAL) * q
    day.protein += e.protein * q
    day.carbs += (e.carbs ?? 0) * q
    day.fat += (e.fat ?? 0) * q
    byDay.set(e.entryDate, day)
  }
  const totals = [...byDay.values()].reduce<DayTotals>(
    (acc, d) => ({
      kcal: acc.kcal + d.kcal,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  const n = byDay.size || 1
  return {
    loggedDays: byDay.size,
    totals,
    avg: { kcal: totals.kcal / n, protein: totals.protein / n, carbs: totals.carbs / n, fat: totals.fat / n },
  }
}

/**
 * Loads the entries behind a rolling "last N days" average: the N most recent
 * non-skipped days before today.
 */
export async function loadRollingAverage(count: number, today = new Date()): Promise<RollingAverage> {
  const start = startOfDay(today)
  const yesterdayKey = dateKey(addDays(start, -1))
  const lookbackStartKey = dateKey(addDays(start, -MAX_LOOKBACK_DAYS))
  const skipped = new Set(await getSkippedDaysInRange(lookbackStartKey, yesterdayKey))
  const dayKeys = pickAverageDayKeys(count, skipped, today)
  if (dayKeys.length === 0) return averageForDays([], [])
  const oldestKey = dayKeys[dayKeys.length - 1]
  const entries = await getEntriesInRange(oldestKey, yesterdayKey)
  return averageForDays(entries, dayKeys)
}
