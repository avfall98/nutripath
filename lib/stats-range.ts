import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

export type DateRange = { from: Date; to: Date }

export const MAX_RANGE_DAYS = 31

export type PresetId = "week" | "last7" | "last14" | "last21" | "last28" | "month"

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "week", label: "Current week" },
  { id: "last7", label: "Last 7 days" },
  { id: "last14", label: "Last 14 days" },
  { id: "last21", label: "Last 21 days" },
  { id: "last28", label: "Last 28 days" },
  { id: "month", label: "Current month" },
]

const PARAM_FORMAT = "ddMMyyyy"

export function presetRange(id: PresetId, today = new Date()): DateRange {
  const day = startOfDay(today)
  switch (id) {
    case "week":
      return { from: startOfWeek(day, { weekStartsOn: 1 }), to: startOfDay(endOfWeek(day, { weekStartsOn: 1 })) }
    case "month":
      return { from: startOfMonth(day), to: startOfDay(endOfMonth(day)) }
    case "last7":
      return { from: addDays(day, -6), to: day }
    case "last14":
      return { from: addDays(day, -13), to: day }
    case "last21":
      return { from: addDays(day, -20), to: day }
    case "last28":
      return { from: addDays(day, -27), to: day }
  }
}

export const DEFAULT_PRESET: PresetId = "week"

function parseParam(value: string | null): Date | null {
  if (!value || !/^\d{8}$/.test(value)) return null
  const parsed = parse(value, PARAM_FORMAT, new Date())
  return isValid(parsed) ? startOfDay(parsed) : null
}

export function rangeLength(range: DateRange) {
  return differenceInCalendarDays(range.to, range.from) + 1
}

/** Orders the dates and caps the range at MAX_RANGE_DAYS. */
export function normalizeRange(a: Date, b: Date): DateRange {
  const from = startOfDay(a <= b ? a : b)
  const to = startOfDay(a <= b ? b : a)
  const capped = addDays(from, MAX_RANGE_DAYS - 1)
  return { from, to: to > capped ? capped : to }
}

/**
 * Reads ?f=ddMMyyyy&t=ddMMyyyy. Falls back to the legacy ?d= param
 * (week containing that day), then to the default preset.
 */
export function rangeFromParams(params: URLSearchParams, today = new Date()): DateRange {
  const from = parseParam(params.get("f"))
  const to = parseParam(params.get("t"))
  if (from && to) return normalizeRange(from, to)
  if (from) return normalizeRange(from, from)

  const legacy = parseParam(params.get("d"))
  if (legacy) return presetRange("week", legacy)

  return presetRange(DEFAULT_PRESET, today)
}

export function rangeToParams(range: DateRange, today = new Date()): Record<string, string> | null {
  if (sameRange(range, presetRange(DEFAULT_PRESET, today))) return null
  return { f: format(range.from, PARAM_FORMAT), t: format(range.to, PARAM_FORMAT) }
}

export function sameRange(a: DateRange, b: DateRange) {
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to)
}

export function matchPreset(range: DateRange, today = new Date()): PresetId | null {
  return PRESETS.find((p) => sameRange(range, presetRange(p.id, today)))?.id ?? null
}

function isWholeMonth(range: DateRange) {
  return isSameDay(range.from, startOfMonth(range.from)) && isSameDay(range.to, startOfDay(endOfMonth(range.from)))
}

/**
 * Steps a range backward/forward by its own size.
 * Whole calendar months step by month so month lengths stay correct.
 */
export function shiftRange(range: DateRange, direction: -1 | 1): DateRange {
  if (isWholeMonth(range)) {
    const from = startOfMonth(addMonths(range.from, direction))
    return { from, to: startOfDay(endOfMonth(from)) }
  }
  const span = rangeLength(range)
  return { from: addDays(range.from, span * direction), to: addDays(range.to, span * direction) }
}

export function formatRangeLabel(range: DateRange, today = new Date()) {
  const { from, to } = range
  const sameYear = from.getFullYear() === to.getFullYear()
  const showYear = !sameYear || from.getFullYear() !== today.getFullYear()
  if (isSameDay(from, to)) return format(from, showYear ? "MMM d, yyyy" : "MMM d")
  if (sameYear && from.getMonth() === to.getMonth()) {
    return `${format(from, "MMM d")} – ${format(to, "d")}${showYear ? `, ${format(to, "yyyy")}` : ""}`
  }
  if (sameYear) {
    return `${format(from, "MMM d")} – ${format(to, "MMM d")}${showYear ? `, ${format(to, "yyyy")}` : ""}`
  }
  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
}
