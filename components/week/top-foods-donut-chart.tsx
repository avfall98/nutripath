"use client"

import { Cell, Pie, PieChart, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--chart-11)",
]

type FoodEntry = {
  name: string
  kcal: number
  protein: number
}

interface TopFoodsDonutChartProps {
  foods: FoodEntry[]
}

type Slice = { name: string; value: number }

function buildSlices(foods: FoodEntry[], key: "kcal" | "protein"): Slice[] {
  const sorted = [...foods].sort((a, b) => b[key] - a[key])
  const top10 = sorted.slice(0, 10)
  const rest = sorted.slice(10)
  const slices: Slice[] = top10.map((f) => ({ name: f.name, value: Math.round(f[key]) }))
  if (rest.length > 0) {
    slices.push({ name: "Other", value: Math.round(rest.reduce((s, f) => s + f[key], 0)) })
  }
  return slices
}

function buildConfig(slices: Slice[]): ChartConfig {
  return Object.fromEntries(
    slices.map((s, i) => [
      s.name,
      { label: s.name, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  )
}

function DonutChart({
  slices,
  label,
  unit,
}: {
  slices: Slice[]
  label: string
  unit: string
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  const config = buildConfig(slices)

  return (
    <div className="relative">
      <ChartContainer config={config} className="h-[180px] w-[180px]">
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={slices.length > 1 ? 2 : 0}
            dataKey="value"
            strokeWidth={0}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]
              const pct = total > 0 ? Math.round(((d.value as number) / total) * 100) : 0
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-[13px] shadow-md">
                  <p className="font-semibold text-foreground">{d.name}</p>
                  <p className="text-muted-foreground">
                    {(d.value as number).toLocaleString()}
                    {unit}
                    <span className="ml-1 text-faint">({pct}%)</span>
                  </p>
                </div>
              )
            }}
          />
        </PieChart>
      </ChartContainer>
      {/* Centre label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums leading-none">
          {total.toLocaleString()}
        </span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-faint">
          {label}
        </span>
      </div>
    </div>
  )
}

export function TopFoodsDonutChart({ foods }: TopFoodsDonutChartProps) {
  if (!foods.length) return null

  const kcalSlices = buildSlices(foods, "kcal")
  const proteinSlices = buildSlices(foods, "protein")

  return (
    <div className="flex items-center gap-8">
      <DonutChart slices={kcalSlices} label="kcal" unit=" kcal" />
      <DonutChart slices={proteinSlices} label="protein" unit="g" />
    </div>
  )
}
