"use client"

import { addDays, format, isToday, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function DayNavigator({
  date,
  onDateChange,
}: {
  date: string
  onDateChange: (date: string) => void
}) {
  const parsed = parseISO(date)
  const today = isToday(parsed)

  function shift(days: number) {
    onDateChange(format(addDays(parsed, days), "yyyy-MM-dd"))
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-2">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Previous day"
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>{format(parsed, "EEE, MMM d")}</span>
        {today ? (
          <span className="text-primary">Today</span>
        ) : (
          <button
            type="button"
            onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
            className="text-primary underline-offset-2 hover:underline"
          >
            Jump to today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        aria-label="Next day"
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
