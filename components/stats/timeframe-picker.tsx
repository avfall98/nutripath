"use client"

import { useState } from "react"
import { differenceInCalendarDays } from "date-fns"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  MAX_RANGE_DAYS,
  PRESETS,
  formatRangeLabel,
  matchPreset,
  normalizeRange,
  presetRange,
  type DateRange,
  type PresetId,
} from "@/lib/stats-range"

const TRIGGER =
  "flex h-9 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-ring"

export function TimeframePicker({
  range,
  onChange,
  className,
}: {
  range: DateRange
  onChange: (range: DateRange) => void
  className?: string
}) {
  const preset = matchPreset(range)
  const presetLabel = PRESETS.find((p) => p.id === preset)?.label ?? "Custom range"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER} aria-label={`Timeframe: ${presetLabel}`}>
          <span className="truncate">{presetLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuRadioGroup
            value={preset ?? ""}
            onValueChange={(value) => onChange(presetRange(value as PresetId))}
          >
            {PRESETS.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <RangeCalendar range={range} onChange={onChange} />
    </div>
  )
}

function RangeCalendar({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false)
  const [pendingFrom, setPendingFrom] = useState<Date | null>(null)
  const [month, setMonth] = useState<Date>(range.to)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setPendingFrom(null)
      setMonth(range.to)
    }
  }

  function handleDayClick(day: Date) {
    if (!pendingFrom) {
      setPendingFrom(day)
      return
    }
    onChange(normalizeRange(pendingFrom, day))
    setPendingFrom(null)
    setOpen(false)
  }

  const selected = pendingFrom ? { from: pendingFrom, to: undefined } : { from: range.from, to: range.to }
  const disabled = pendingFrom
    ? (day: Date) => Math.abs(differenceInCalendarDays(day, pendingFrom)) >= MAX_RANGE_DAYS
    : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={cn(TRIGGER, "tabular-nums")} aria-label="Pick a custom date range">
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{formatRangeLabel(range)}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={() => {}}
          onDayClick={handleDayClick}
          disabled={disabled}
          month={month}
          onMonthChange={setMonth}
          weekStartsOn={1}
          className="p-0"
        />
        <p className="mt-3 max-w-64 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
          {pendingFrom ? `Now pick an end date (up to ${MAX_RANGE_DAYS} days).` : "Pick a start date."}
        </p>
      </PopoverContent>
    </Popover>
  )
}
