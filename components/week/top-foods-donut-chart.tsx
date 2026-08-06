"use client"

import { Cell, Pie, PieChart, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
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
  "var(--chart-11)", // "Other"
]

type FoodSlice = {
  name: string
  count: number
}

interface TopFoodsDonutChartProps {
  foods: FoodSlice[]
}

export function TopFoodsDonutChart({ foods }: TopFoodsDonutChartProps) {
  // Top 10 by count, rest grouped as "Other"
  const sorted = [...foods].sort((a, b) => b.count - a.count)
  const top10 = sorted.slice(0, 10)
  const rest = sorted.slice(10)

  const slices = top10.map((f) => ({ name: f.name, value: f.count }))
  if (rest.length > 0) {
    slices.push({ name: "Other", value: rest.reduce((s, f) => s + f.count, 0) })
  }

  const total = slices.reduce((s, d) => s + d.value, 0)

  // Build ChartContainer config
  const config: ChartConfig = Object.fromEntries(
    slices.map((s, i) => [
      `slice_${i}`,
      { label: s.name, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  )

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
      {/* Donut */}
      <div className="relative shrink-0">
        <ChartContainer config={config} className="h-[200px] w-[200px]">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={slices.length > 1 ? 2 : 0}
              dataKey="value"
              strokeWidth={0}
            >
              {slices.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span>
                      {name}
                      <span className="ml-2 font-bold tabular-nums">{value}×</span>
                    </span>
                  )}
                  hideIndicator
                />
              }
            />
          </PieChart>
        </ChartContainer>
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-[10px] font-bold uppercase tracking-[.08em] text-faint">servings</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap content-start gap-x-5 gap-y-2 self-center">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
          return (
            <li key={s.name} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[13px] text-muted-foreground">
                <span className="font-bold text-foreground">{s.value}×</span>
                {" "}
                {s.name}
                <span className="ml-1 text-faint">({pct}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
