"use client"

import { Minus, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (value: string) => void
  step?: number
  min?: number
  className?: string
}

/**
 * Pill-shaped number stepper: [-] [input] [+]
 * Used for the "Servings" quantity mode so users can quickly nudge the
 * value up/down by `step` (default 0.5) without typing.
 */
export function ServingsStepper({ value, onChange, step = 0.5, min = 0, className }: Props) {
  function num(v: string, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) && v.trim() !== "" ? n : fallback
  }

  function nudge(delta: number) {
    const current = num(value, 0)
    const next = Math.max(min, Math.round((current + delta) * 100) / 100)
    onChange(next.toString())
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => nudge(-step)}
        aria-label="Decrease servings"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary active:scale-95"
      >
        <Minus className="size-4" />
      </button>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        aria-label="Servings"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-16 rounded-full text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        placeholder="1"
      />
      <button
        type="button"
        onClick={() => nudge(step)}
        aria-label="Increase servings"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary active:scale-95"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
