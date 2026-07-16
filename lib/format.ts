// Convert a nullable numeric DB string into a number (or null).
export function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Same as num() but defaults to 0 for required numeric columns.
export function num0(value: string | number | null | undefined): number {
  return num(value) ?? 0
}

// Convert a form/number value into a string for a numeric column (or null).
export function toNumeric(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : null
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

// Local YYYY-MM-DD (avoids UTC offset surprises from toISOString()).
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
