"use client"

import { useMemo, useState, useTransition, useEffect } from "react"
import useSWR from "swr"
import { addEntryFromFood, addQuickEntry } from "@/app/actions/entries"
import { getRecentFoods, getFavouriteFoods } from "@/app/actions/foods"
import type { FoodDTO, MealGroupDTO } from "@/lib/types"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Clock, Loader2, Plus, Search, Star, UtensilsCrossed } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: MealGroupDTO
  dateKey: string
  foods: FoodDTO[]
  targetCalories?: number | null
  targetProtein?: number | null
  onAdded: () => void
}

type QuantityMode = "servings" | "weight"
type TabKey = "library" | "recent" | "favourites" | "quick"
type ServingUnit = "g" | "ml"

const KJ_PER_KCAL = 4.184

const ROW_GRID = "grid grid-cols-[28px_44px_1fr_120px_112px_60px_60px_80px_80px_32px] items-center gap-x-3"

export function AddFoodDialog({
  open,
  onOpenChange,
  group,
  dateKey,
  foods,
  targetCalories,
  targetProtein,
  onAdded,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabKey>(() => {
    // Initialize from session storage, default to "favourites"
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("addFoodDialog_selectedTab")
      return (saved as TabKey) || "favourites"
    }
    return "favourites"
  })
  const [query, setQuery] = useState("")
  const [qtyMode, setQtyMode] = useState<QuantityMode>("servings")

  // Save tab selection to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("addFoodDialog_selectedTab", tab)
  }, [tab])
  const [servings, setServings] = useState("1")
  const [weight, setWeight] = useState("")
  const [servingUnit, setServingUnit] = useState<ServingUnit>("g")
  const [quick, setQuick] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "", servingUnitCustom: "g" as ServingUnit, quantity: "1" })
  const [showNutrition, setShowNutrition] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q),
    )
  }, [foods, query])

  // Lazily load Recent / Favourites only while the dialog is open on that tab.
  const { data: recentFoods, isLoading: recentLoading } = useSWR(
    open && tab === "recent" ? ["recent-foods", dateKey] : null,
    () => getRecentFoods(10),
  )
  const { data: favouriteFoods, isLoading: favouriteLoading } = useSWR(
    open && tab === "favourites" ? ["favourite-foods", dateKey] : null,
    () => getFavouriteFoods(20),
  )

  function num(v: string, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) && v.trim() !== "" ? n : fallback
  }

  function addFromLibrary(food: FoodDTO) {
    let quantity = 1

    if (qtyMode === "servings") {
      quantity = num(servings, 1) || 1
    } else {
      const weightValue = num(weight, 0)
      if (!food.servingSize || weightValue <= 0) {
        toast.error("Enter a weight and ensure the food has a serving size defined.")
        return
      }
      const servingSizeMatch = food.servingSize.match(/^([\d.]+)/)
      const servingSizeValue = servingSizeMatch ? Number.parseFloat(servingSizeMatch[1]) : null
      if (servingSizeValue === null || servingSizeValue <= 0) {
        toast.error("Food serving size is not properly defined.")
        return
      }
      quantity = weightValue / servingSizeValue
    }

    startTransition(async () => {
      await addEntryFromFood({
        dateKey,
        foodId: food.id,
        mealGroupId: group.id,
        mealGroupName: group.name,
        quantity,
      })
      toast.success(`Added ${food.name} to ${group.name}.`)
      onAdded()
    })
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quick.name.trim()) {
      toast.error("Enter a name for the item.")
      return
    }
    startTransition(async () => {
      await addQuickEntry({
        dateKey,
        mealGroupId: group.id,
        mealGroupName: group.name,
        name: quick.name,
        calories: num(quick.calories),
        protein: num(quick.protein),
        carbs: quick.carbs.trim() === "" ? null : num(quick.carbs),
        fat: quick.fat.trim() === "" ? null : num(quick.fat),
        quantity: num(quick.quantity, 1) || 1,
      })
      toast.success(`Added ${quick.name} to ${group.name}.`)
      setQuick({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "", servingUnitCustom: "g", quantity: "1" })
      onAdded()
      onOpenChange(false)
    })
  }

  function renderQuantityControls() {
    return (
      <div className="flex items-center gap-3">
        {qtyMode === "servings" ? (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            aria-label="Servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="h-11 w-24 rounded-full text-center"
            placeholder="1"
          />
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            aria-label="Weight in grams"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-11 w-24 rounded-full text-center"
            placeholder="g"
          />
        )}
        <div className="flex shrink-0 items-center rounded-full bg-inset p-1">
          {(["servings", "weight"] as QuantityMode[]).map((mode) => {
            const active = qtyMode === mode
            const label = mode === "servings" ? "Servings" : "g/ml"
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setQtyMode(mode)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderFoodList(list: FoodDTO[]) {
    return (
      <>
        {/* Desktop table */}
        <div className="hidden flex-col md:flex">
          <div
            className={cn(
              ROW_GRID,
              "border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint",
            )}
          >
            <span className="text-right"></span>
            <span />
            <span>Food</span>
            <span>Kcal</span>
            <span>Protein</span>
            <span>Carbs</span>
            <span>Fat</span>
            <span className="text-right">Kcal score</span>
            <span className="text-right">P score</span>
            <span />
          </div>
          <ul className="mt-1 flex flex-col">
            {list.map((food, i) => {
              const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
              const caloriesPct = targetCalories ? Math.round((caloriesKcal / targetCalories) * 100) : 0
              const proteinPct = targetProtein ? Math.round((food.protein / targetProtein) * 100) : 0
              return (
                <li key={food.id} className={cn(ROW_GRID, "group rounded-[4px] px-2 py-2.5 hover:bg-white/[0.08]")}>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => addFromLibrary(food)}
                      aria-label={`Add ${food.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="size-11 shrink-0 overflow-hidden rounded-[4px] bg-track">
                    {food.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-faint">
                        <UtensilsCrossed className="size-4" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="max-w-full truncate text-[14px] font-semibold leading-tight">{food.name}</p>
                    {(food.brand || food.servingSize || food.servingsPack || food.packSize) && (
                      <p className="truncate text-[11.5px] text-faint">
                        {food.servingsPack && food.servingSize && food.packSize
                          ? `${food.servingsPack} x ${food.servingSize} servings / ${food.packSize}`
                          : food.brand && food.servingSize
                          ? `${food.brand} · ${food.servingSize}`
                          : food.brand || food.servingSize || ""}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="calories" />
                    {caloriesKcal}
                    {targetCalories ? <span className="font-normal text-faint">({caloriesPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="protein" />
                    {Math.round(food.protein)}
                    {targetProtein ? <span className="font-normal text-faint">({proteinPct}%)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="carbs" />
                    {food.carbs != null ? Math.round(food.carbs) : "—"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="fat" />
                    {food.fat != null ? Math.round(food.fat) : "—"}
                  </span>
                  <div className="flex items-center justify-end">
                    <CalorieDensityBadge kcal={caloriesKcal} servingSize={food.servingSize} />
                  </div>
                  <div className="flex items-center justify-end">
                    <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 pb-1 text-center text-[11.5px] text-faint">
            Showing {list.length} {list.length === 1 ? "food" : "foods"}
          </p>
        </div>

        {/* Mobile stacked cards */}
        <div className="flex flex-col md:hidden gap-2">
          {/* Nutrition toggle - mobile only */}
          <div className="flex items-center gap-2 px-2 py-1">
            <label htmlFor="show-nutrition" className="text-sm font-medium text-foreground cursor-pointer">
              Show nutrition details
            </label>
            <input
              id="show-nutrition"
              type="checkbox"
              checked={showNutrition}
              onChange={(e) => setShowNutrition(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>
          <ul className="flex flex-col">
            {list.map((food) => {
              const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
              const caloriesPct = targetCalories ? Math.round((caloriesKcal / targetCalories) * 100) : 0
              const proteinPct = targetProtein ? Math.round((food.protein / targetProtein) * 100) : 0
              return (
                <li key={food.id} className="flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0">
                  {/* Row 1: Thumbnail + Name/Details + Add button */}
                  <div className="flex items-start gap-3 pr-2">
                    <span className="size-12 shrink-0 overflow-hidden rounded-[4px] bg-track">
                      {food.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-faint">
                          <UtensilsCrossed className="size-5" />
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={!food}
                      className="min-w-0 flex-1 text-left transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                    >
                      <p className="text-[13.5px] font-semibold leading-tight text-pretty">
                        {food.name}
                        {(food.brand || food.servingSize || food.servingsPack || food.packSize) && (
                          <span className="block md:ml-2 md:inline text-[11.5px] font-normal text-faint">
                            {food.servingsPack && food.servingSize && food.packSize
                              ? `${food.servingsPack} x ${food.servingSize} servings / ${food.packSize}`
                              : food.brand && food.servingSize
                              ? `${food.brand} · ${food.servingSize}`
                              : food.brand || food.servingSize || ""}
                          </span>
                        )}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => addFromLibrary(food)}
                      aria-label={`Add ${food.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  
                  {/* Row 2: Macro badges - conditional */}
                  {showNutrition && (
                    <MacroBadges
                      kcal={caloriesKcal}
                      kcalPct={targetCalories ? caloriesPct : null}
                      protein={food.protein}
                      proteinPct={targetProtein ? proteinPct : null}
                      carbs={food.carbs}
                      fat={food.fat}
                    />
                  )}
                  
                  {/* Row 3: Score badges - conditional */}
                  {showNutrition && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal} />
                      <CalorieDensityBadge kcal={caloriesKcal} servingSize={food.servingSize} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </>
    )
  }

  const emptyState = (icon: React.ReactNode, text: string) => (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
      {icon}
      <p className="max-w-xs text-pretty">{text}</p>
    </div>
  )

  const loadingState = (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88svh] max-h-[88svh] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.5px]">Add to {group.name}</DialogTitle>
        </DialogHeader>

        {/* Pill tabs */}
        <div className="flex items-center gap-2">
          {(
            [
              { key: "library", label: "Library" },
              { key: "favourites", label: "Favs" },
              { key: "recent", label: "Recent" },
              { key: "quick", label: "Custom" },
            ] as { key: TabKey; label: string }[]
          ).map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                  active ? "bg-white text-black" : "bg-[#232323] text-white hover:bg-[#2a2a2a]",
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {tab !== "quick" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Search (library only) + servings/weight toggle + quantity */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {tab === "library" ? (
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-12 w-full rounded-full bg-inset pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-inset-hover focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="Search foods..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              ) : (
                <p className="flex-1 text-sm text-muted-foreground">
                  {tab === "recent"
                    ? "Your 10 most recently logged foods."
                    : "Foods you've tagged as favourites in your library."}
                </p>
              )}
              {renderQuantityControls()}
            </div>

            {/* List */}
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {tab === "library" ? (
                foods.length === 0 ? (
                  emptyState(
                    <UtensilsCrossed className="size-6" />,
                    "No foods saved yet. Add some in the Foods tab, or use Quick add.",
                  )
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No matches for &quot;{query}&quot;.</p>
                ) : (
                  renderFoodList(filtered)
                )
              ) : tab === "recent" ? (
                recentLoading ? (
                  loadingState
                ) : !recentFoods || recentFoods.length === 0 ? (
                  emptyState(
                    <Clock className="size-6" />,
                    "No recently logged foods yet. Add a food from your library and it will show up here.",
                  )
                ) : (
                  renderFoodList(recentFoods)
                )
              ) : favouriteLoading ? (
                loadingState
              ) : !favouriteFoods || favouriteFoods.length === 0 ? (
                emptyState(
                  <Star className="size-6" />,
                      "No favourites yet. Tag foods as favourites from your food library and they'll appear here.",
                )
              ) : (
                renderFoodList(favouriteFoods)
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={submitQuick}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="q-name">Name</FieldLabel>
                  <Input
                    id="q-name"
                    value={quick.name}
                    onChange={(e) => setQuick((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Banana"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="q-cal">Calories</FieldLabel>
                    <Input
                      id="q-cal"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.calories}
                      onChange={(e) => setQuick((s) => ({ ...s, calories: e.target.value }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="q-pro">Protein</FieldLabel>
                    <Input
                      id="q-pro"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.protein}
                      onChange={(e) => setQuick((s) => ({ ...s, protein: e.target.value }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="q-carb">Carbs</FieldLabel>
                    <Input
                      id="q-carb"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.carbs}
                      onChange={(e) => setQuick((s) => ({ ...s, carbs: e.target.value }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="q-fat">Fat</FieldLabel>
                    <Input
                      id="q-fat"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.fat}
                      onChange={(e) => setQuick((s) => ({ ...s, fat: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-[1fr_100px_100px] gap-3">
                  <Field>
                    <FieldLabel htmlFor="q-serving">Serving Size</FieldLabel>
                    <Input
                      id="q-serving"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.servingSize}
                      onChange={(e) => setQuick((s) => ({ ...s, servingSize: e.target.value }))}
                      placeholder="e.g. 100"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Unit</FieldLabel>
                    <div className="flex shrink-0 items-center rounded-full bg-inset p-1">
                      {(["g", "ml"] as ServingUnit[]).map((unit) => {
                        const active = quick.servingUnitCustom === unit
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => setQuick((s) => ({ ...s, servingUnitCustom: unit }))}
                            className={cn(
                              "rounded-full px-3 py-1 text-[13px] font-bold transition-colors",
                              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
                            )}
                          >
                            {unit}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="q-qty">Servings</FieldLabel>
                    <Input
                      id="q-qty"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={quick.quantity}
                      onChange={(e) => setQuick((s) => ({ ...s, quantity: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="flex justify-center pt-2">
                  <Button type="submit" disabled={pending} className="rounded-full bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90">
                    <Plus data-icon="inline-start" />
                    Add to {group.name}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
