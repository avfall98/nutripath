"use client"

import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

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
]

const OTHER_KEY = "__other__"
const OTHER_COLOR = "var(--chart-11)"

type FoodEntry = {
  key: string
  name: string
  kcal: number
  protein: number
}

interface TopFoodsDonutChartProps {
  foods: FoodEntry[]
  totalKcal: number
  totalProtein: number
  activeKey: string | null
  onActiveChange: (key: string | null) => void
}

type Slice = { key: string; name: string; value: number; color: string }

function colorForIndex(i: number) {
  return CHART_COLORS[i % CHART_COLORS.length]
}

function buildSlices(foods: FoodEntry[], total: number, metric: "kcal" | "protein"): Slice[] {
  const slices: Slice[] = foods.map((f, i) => ({
    key: f.key,
    name: f.name,
    value: Math.round(f[metric]),
    color: colorForIndex(i),
  }))
  const top = foods.reduce((s, f) => s + f[metric], 0)
  const other = total - top
  if (other > 0.5) {
    slices.push({ key: OTHER_KEY, name: "Other", value: Math.round(other), color: OTHER_COLOR })
  }
  return slices
}

function buildConfig(slices: Slice[]): ChartConfig {
  return Object.fromEntries(slices.map((s) => [s.key, { label: s.name, color: s.color }]))
}

function DonutChart({
  slices,
  label,
  unit,
  activeKey,
  onActiveChange,
}: {
  slices: Slice[]
  label: string
  unit: string
  activeKey: string | null
  onActiveChange: (key: string | null) => void
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
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell
                key={s.key}
                fill={s.color}
                fillOpacity={activeKey && activeKey !== s.key ? 0.25 : 1}
                onMouseEnter={() => onActiveChange(s.key)}
                onMouseLeave={() => onActiveChange(null)}
                style={{ transition: "fill-opacity 150ms ease", cursor: "pointer" }}
              />
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
        <span className="text-xl font-bold tabular-nums leading-none">{total.toLocaleString()}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-faint">{label}</span>
      </div>
    </div>
  )
}

export function TopFoodsDonutChart({
  foods,
  totalKcal,
  totalProtein,
  activeKey,
  onActiveChange,
}: TopFoodsDonutChartProps) {
  if (!foods.length) return null

  const kcalSlices = buildSlices(foods, totalKcal, "kcal")
  const proteinSlices = buildSlices(foods, totalProtein, "protein")

  return (
    <div className="flex items-center justify-center gap-8">
      <DonutChart
        slices={kcalSlices}
        label="kcal"
        unit=" kcal"
        activeKey={activeKey}
        onActiveChange={onActiveChange}
      />
      <DonutChart
        slices={proteinSlices}
        label="protein"
        unit="g"
        activeKey={activeKey}
        onActiveChange={onActiveChange}
      />
    </div>
  )
}
