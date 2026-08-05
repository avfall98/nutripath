"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import useSWR from "swr"
import { updateEntry } from "@/app/actions/entries"
import { getRecentFoods, getFavouriteFoods } from "@/app/actions/foods"
import { round } from "@/lib/format"
import type { EntryDTO, FoodDTO } from "@/lib/types"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Apple, Clock, Loader2, Plus, Search, Star, UtensilsCrossed } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: EntryDTO
  foods: FoodDTO[]
  onUpdated: () => void
}

type QuantityMode = "servings" | "weight"
type TabKey = "library" | "recent" | "favourites"
type Step = "edit" | "select"

const KJ_PER_KCAL = 4.184
const ROW_GRID =
  "grid grid-cols-[28px_44px_1fr_120px_112px_60px_60px_80px_80px_32px] items-center gap-x-3"

export function EditEntryDialog({ open, onOpenChange, entry, foods, onUpdated }: Props) {
  const [pending, startTransition] = useTransition()

  // Step state
  const [step, setStep] = useState<Step>("edit")

  // Select-step state
  const [tab, setTab] = useState<TabKey>("library")
  const [query, setQuery] = useState("")
  const [showNutrition, setShowNutrition] = useState(false)

  // Selected food (starts as the current entry food)
  const [selectedFood, setSelectedFood] = useState<FoodDTO | null>(
    () => foods.find((f) => f.id === entry.foodId) ?? null,
  )

  // Quantity-step state
  const [qtyMode, setQtyMode] = useState<QuantityMode>("servings")
  const [servings, setServings] = useState(entry.quantity.toString())
  const [weight, setWeight] = useState("")

  // Lazy load recent / favourites
  const { data: recentFoods, isLoading: recentLoading } = useSWR(
    open && tab === "recent" ? ["edit-recent-foods"] : null,
    () => getRecentFoods(10),
  )
  const { data: favouriteFoods, isLoading: favouriteLoading } = useSWR(
    open && tab === "favourites" ? ["edit-favourite-foods"] : null,
    () => getFavouriteFoods(20),
  )

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("edit")
      setTab("library")
      setQuery("")
      setServings(entry.quantity.toString())
      setWeight("")
      setQtyMode("servings")
      setSelectedFood(foods.find((f) => f.id === entry.foodId) ?? null)
    }
  }, [open, entry, foods])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q),
    )
  }, [foods, query])

  function num(v: string, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) && v.trim() !== "" ? n : fallback
  }

  function handleSelectFood(food: FoodDTO) {
    setSelectedFood(food)
    setServings("1")
    setWeight("")
    setQtyMode("servings")
    setStep("edit")
  }

  function handleSave() {
    const food = selectedFood
    if (!food) return

    let quantity = 1
    if (qtyMode === "servings") {
      quantity = num(servings, 1) || 1
    } else {
      const weightValue = num(weight, 0)
      if (!food.servingSize || weightValue <= 0) {
        toast.error("Enter a weight and ensure the food has a serving size defined.")
        return
      }
      const match = food.servingSize.match(/^([\d.]+)/)
      const ssVal = match ? parseFloat(match[1]) : null
      if (ssVal === null || ssVal <= 0) {
        toast.error("Food serving size is not properly defined.")
        return
      }
      quantity = weightValue / ssVal
    }

    startTransition(async () => {
      await updateEntry(entry.id, { foodId: food.id, quantity })
      toast.success(`Updated ${food.name}.`)
      onUpdated()
      onOpenChange(false)
    })
  }

  // Adjusted nutrition preview for the quantity step
  const adjustedNutrition = useMemo(() => {
    const food = selectedFood
    if (!food) return entry
    let quantity = entry.quantity
    if (qtyMode === "servings") {
      quantity = num(servings, entry.quantity)
    } else {
      const weightValue = num(weight, 0)
      if (food.servingSize && weightValue > 0) {
        const match = food.servingSize.match(/^([\d.]+)/)
        const ssVal = match ? parseFloat(match[1]) : null
        if (ssVal && ssVal > 0) quantity = weightValue / ssVal
      }
    }
    const ratio = quantity / (entry.quantity || 1)
    return {
      ...entry,
      calories: entry.calories * ratio,
      protein: entry.protein * ratio,
      carbs: entry.carbs != null ? entry.carbs * ratio : null,
      fat: entry.fat != null ? entry.fat * ratio : null,
    }
  }, [entry, selectedFood, qtyMode, servings, weight])

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
            <span className="text-right" />
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
            {list.map((food) => {
              const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
              return (
                <li
                  key={food.id}
                  className={cn(ROW_GRID, "group rounded-[4px] px-2 py-2.5 hover:bg-white/[0.08]")}
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSelectFood(food)}
                      aria-label={`Select ${food.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="size-11 shrink-0 overflow-hidden rounded-[4px] bg-track">
                    {food.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={food.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-faint">
                        <UtensilsCrossed className="size-4" />
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleSelectFood(food)}
                    className="min-w-0 text-left"
                  >
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
                  </button>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="calories" />
                    {caloriesKcal}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                    <MacroIcon macro="protein" />
                    {Math.round(food.protein)}
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
                  <span />
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
          <div className="flex items-center gap-2 px-2 py-1">
            <label htmlFor="edit-show-nutrition" className="cursor-pointer text-sm font-medium text-foreground">
              Show nutrition details
            </label>
            <input
              id="edit-show-nutrition"
              type="checkbox"
              checked={showNutrition}
              onChange={(e) => setShowNutrition(e.target.checked)}
              className="h-4 w-4 rounded cursor-pointer"
            />
          </div>
          <ul className="flex flex-col">
            {list.map((food) => {
              const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
              return (
                <li
                  key={food.id}
                  className="flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-3 pr-2">
                    <span className="size-12 shrink-0 overflow-hidden rounded-[4px] bg-track">
                      {food.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-faint">
                          <UtensilsCrossed className="size-5" />
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSelectFood(food)}
                      className="min-w-0 flex-1 text-left transition-opacity enabled:hover:opacity-80"
                    >
                      <p className="text-[13.5px] font-semibold leading-tight text-pretty">{food.name}</p>
                      {(food.brand || food.servingSize) && (
                        <p className="text-[11.5px] text-faint">
                          {food.brand && food.servingSize
                            ? `${food.brand} · ${food.servingSize}`
                            : food.brand || food.servingSize}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSelectFood(food)}
                      aria-label={`Select ${food.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {showNutrition && (
                    <MacroBadges
                      kcal={caloriesKcal}
                      protein={food.protein}
                      carbs={food.carbs}
                      fat={food.fat}
                    />
                  )}
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

  // ── Select step ──────────────────────────────────────────────────────────────
  if (step === "select") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[88svh] max-h-[88svh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-[-0.5px]">Select food item</DialogTitle>
            <DialogDescription className="sr-only">
              Search and select a food to edit this entry.
            </DialogDescription>
          </DialogHeader>

          {/* Back link */}
          <button
            type="button"
            onClick={() => setStep("edit")}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </button>

          {/* Pill tabs */}
          <div className="flex items-center gap-2">
            {(
              [
                { key: "library", label: "Library" },
                { key: "favourites", label: "Favs" },
                { key: "recent", label: "Recent" },
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

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Search (library only) + quantity controls */}
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

            {/* Food list */}
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {tab === "library" ? (
                foods.length === 0 ? (
                  emptyState(
                    <UtensilsCrossed className="size-6" />,
                    "No foods saved yet. Add some in the Foods tab.",
                  )
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No matches for &quot;{query}&quot;.
                  </p>
                ) : (
                  renderFoodList(filtered)
                )
              ) : tab === "recent" ? (
                recentLoading ? (
                  loadingState
                ) : !recentFoods || recentFoods.length === 0 ? (
                  emptyState(
                    <Clock className="size-6" />,
                    "No recently logged foods yet.",
                  )
                ) : (
                  renderFoodList(recentFoods)
                )
              ) : favouriteLoading ? (
                loadingState
              ) : !favouriteFoods || favouriteFoods.length === 0 ? (
                emptyState(
                  <Star className="size-6" />,
                  "No favourites yet. Tag foods as favourites from your food library.",
                )
              ) : (
                renderFoodList(favouriteFoods)
              )}
            </div>
          </div>

          </DialogContent>
          </Dialog>
          )
          }

  // ── Edit step (first view — existing entry) ──────────────────────────────────
  if (step === "edit") {
    const editFood = selectedFood
    const editUnit = editFood?.servingSize?.match(/(g|ml)\s*$/i)?.[1]?.toLowerCase() ?? "g"
    const editGridCols =
      "grid grid-cols-[1fr_minmax(0,6rem)_minmax(0,6rem)] gap-3 sm:grid-cols-[1fr_minmax(0,9rem)_minmax(0,9rem)] sm:gap-4"
    const editFmt = (v: number | null | undefined) => (v == null ? "—" : String(round(v, 1)))
    const editCell = (v: number | null | undefined, faint = false) => (
      <div
        className={cn(
          "flex h-10 items-center justify-end rounded-md bg-inset px-3 text-sm tabular-nums",
          faint ? "text-faint" : "text-foreground",
        )}
      >
        {editFmt(v)}
      </div>
    )
    const editRow = (
      label: string,
      serving: number | null | undefined,
      hundred: number | null | undefined,
      indent = false,
    ) => (
      <div key={label} className={cn(editGridCols, "items-center border-t border-border/40 py-2.5")}>
        <span className={cn("text-sm", indent ? "pl-4 text-muted-foreground" : "font-medium text-foreground")}>
          {label}
        </span>
        {editCell(serving)}
        {editCell(hundred)}
      </div>
    )

    const editAdjQty = round(
      qtyMode === "servings"
        ? num(servings, entry.quantity)
        : (() => {
            const wv = num(weight, 0)
            if (!editFood?.servingSize || wv <= 0) return entry.quantity
            const m = editFood.servingSize.match(/^([\d.]+)/)
            const ss = m ? parseFloat(m[1]) : null
            return ss && ss > 0 ? wv / ss : entry.quantity
          })(),
      1,
    )
    const editQtyLabel =
      editAdjQty % 1 === 0 ? String(Math.floor(editAdjQty)) : String(editAdjQty)

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
            <DialogDescription>Change the food item or adjust the serving size.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto">
            {/* Food card — clicking it navigates to food selection */}
            <button
              type="button"
              onClick={() => setStep("select")}
              className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4 text-left transition-colors hover:bg-muted/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-muted">
                  {editFood?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editFood.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Apple className="size-5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {editFood?.name ?? entry.name}
                  </p>
                  <p className="text-[12px] text-faint">
                    {editQtyLabel} serving{editAdjQty === 1 ? "" : "s"}
                    {editFood?.servingSize && <>{" − "}{editFood.servingSize}</>}
                  </p>
                </div>
              </div>
              <MacroBadges
                kcal={Math.round(adjustedNutrition.calories / KJ_PER_KCAL)}
                protein={Math.round(adjustedNutrition.protein)}
                carbs={adjustedNutrition.carbs != null ? Math.round(adjustedNutrition.carbs) : null}
                fat={adjustedNutrition.fat != null ? Math.round(adjustedNutrition.fat) : null}
              />
            </button>

            {/* Quantity controls */}
            {renderQuantityControls()}

            {/* Nutrition table */}
            {editFood && (
              <div className="flex flex-col">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  Nutrition information
                </h3>
                <div className={cn(editGridCols, "pb-1")}>
                  <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint">Nutrient</span>
                  <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                    Per serving
                  </span>
                  <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                    Per 100{editUnit}
                  </span>
                </div>
                {editRow("Energy (kJ)", editFood.calories, editFood.caloriesPerHundred)}
                <div className={cn(editGridCols, "items-center border-t border-border/40 py-2.5")}>
                  <span className="text-sm text-faint">Calories (kcal)</span>
                  {editCell(editFood.calories != null ? editFood.calories / KJ_PER_KCAL : null, true)}
                  {editCell(
                    editFood.caloriesPerHundred != null ? editFood.caloriesPerHundred / KJ_PER_KCAL : null,
                    true,
                  )}
                </div>
                {editRow("Protein (g)", editFood.protein, editFood.proteinPerHundred)}
                {editRow("Fat (g)", editFood.fat, editFood.fatPerHundred)}
                {editRow("— Saturated (g)", editFood.saturatedFat, editFood.saturatedFatPerHundred, true)}
                {editRow("Carbs (g)", editFood.carbs, editFood.carbsPerHundred)}
                {editRow("— Sugars (g)", editFood.sugars, editFood.sugarsPerHundred, true)}
                {editRow("Dietary fibre (g)", editFood.dietaryFiber, editFood.dietaryFiberPerHundred)}
                {editRow("Sodium (mg)", editFood.sodium, editFood.sodiumPerHundred)}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-center pb-2">
              <Button
                onClick={handleSave}
                disabled={pending || !editFood}
                className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Should never reach here — all steps handled above
  return null
  /* eslint-disable-next-line no-unreachable */
  ;
    </Dialog>
  )
}
