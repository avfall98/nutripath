"use client"

import { addDays, format, isToday, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(-1)}
        aria-label="Previous day"
      >
        <ChevronLeft />
      </Button>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-4 text-muted-foreground" />
          {format(parsed, "EEEE, MMM d")}
        </div>
        {!today && (
          <button
            type="button"
            onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Jump to today
          </button>
        )}
        {today && (
          <span className="text-xs text-muted-foreground">Today</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(1)}
        aria-label="Next day"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
