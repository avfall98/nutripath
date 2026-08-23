"use client"

// Donut charts for the most common foods (kcal + protein breakdown).
import { Cell, Pie, PieChart } from "recharts"
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
  activeKey,
  onActiveChange,
}: {
  slices: Slice[]
  label: string
  activeKey: string | null
  onActiveChange: (key: string | null) => void
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  const config = buildConfig(slices)

  return (
    <div className="relative shrink-0">
      <ChartContainer config={config} className="h-[200px] w-[200px] sm:h-[180px] sm:w-[180px]">
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="90%"
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
        </PieChart>
      </ChartContainer>
      {/* Centre label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums leading-none sm:text-xl">{total.toLocaleString()}</span>
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

  const kcalTotal = kcalSlices.reduce((s, d) => s + d.value, 0)
  const proteinTotal = proteinSlices.reduce((s, d) => s + d.value, 0)

  const activeKcal = activeKey ? kcalSlices.find((s) => s.key === activeKey) : undefined
  const activeProtein = activeKey ? proteinSlices.find((s) => s.key === activeKey) : undefined
  const activeSlice = activeKcal ?? activeProtein

  const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
        <DonutChart slices={kcalSlices} label="kcal" activeKey={activeKey} onActiveChange={onActiveChange} />
        <DonutChart slices={proteinSlices} label="protein" activeKey={activeKey} onActiveChange={onActiveChange} />
      </div>
      {/* Fixed caption below the donuts so it never overlaps the chart */}
      <div className="flex h-9 items-center justify-center">
        {activeSlice ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-popover px-3 py-1.5 text-[13px] shadow-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeSlice.color }}
                aria-hidden="true"
              />
              {activeSlice.name}
            </span>
            {activeKcal ? (
              <span className="text-muted-foreground">
                {activeKcal.value.toLocaleString()} kcal
                <span className="ml-1 text-faint">({pct(activeKcal.value, kcalTotal)}%)</span>
              </span>
            ) : null}
            {activeProtein ? (
              <span className="text-muted-foreground">
                {activeProtein.value.toLocaleString()}g protein
                <span className="ml-1 text-faint">({pct(activeProtein.value, proteinTotal)}%)</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
