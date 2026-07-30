"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { updateEntry } from "@/app/actions/entries"
import { round } from "@/lib/format"
import type { EntryDTO, FoodDTO } from "@/lib/types"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Apple, Plus, Search } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: EntryDTO
  foods: FoodDTO[]
  onUpdated: () => void
}

type QuantityMode = "servings" | "weight"

export function EditEntryDialog({ open, onOpenChange, entry, foods, onUpdated }: Props) {
  const KJ_PER_KCAL = 4.184
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [qtyMode, setQtyMode] = useState<QuantityMode>("servings")
  const [servings, setServings] = useState(entry.quantity.toString())
  const [weight, setWeight] = useState("")
  const [weightUnit, setWeightUnit] = useState<"g" | "ml">("g")
  const [activeTab, setActiveTab] = useState<"library" | "quantity">("quantity")

  // Sync servings/weight when dialog opens or entry changes
  useEffect(() => {
    if (open) {
      setServings(entry.quantity.toString())
      setWeight("")
      setQtyMode("servings")
      setActiveTab("quantity")
    }
  }, [open, entry])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q),
    )
  }, [foods, query])

  // Calculate adjusted nutrition based on current servings/weight input
  const adjustedNutrition = useMemo(() => {
    const food = foods.find((f) => f.id === entry.foodId)
    if (!food) return entry
    
    let quantity = entry.quantity
    
    if (qtyMode === "servings") {
      quantity = num(servings, entry.quantity)
    } else {
      const weightValue = num(weight, 0)
      if (food.servingSize && weightValue > 0) {
        const servingSizeMatch = food.servingSize.match(/^([\d.]+)/)
        const servingSizeValue = servingSizeMatch ? parseFloat(servingSizeMatch[1]) : null
        if (servingSizeValue && servingSizeValue > 0) {
          quantity = weightValue / servingSizeValue
        }
      }
    }
    
    // Scale the nutrition values
    const ratio = quantity / entry.quantity
    return {
      ...entry,
      calories: entry.calories * ratio,
      protein: entry.protein * ratio,
      carbs: entry.carbs ? entry.carbs * ratio : null,
      fat: entry.fat ? entry.fat * ratio : null,
    }
  }, [entry, foods, qtyMode, servings, weight])

  function num(v: string, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) && v.trim() !== "" ? n : fallback
  }

  function renderQuantityControls() {
    return (
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center rounded-full bg-inset p-1">
          {(["servings", "weight"] as QuantityMode[]).map((mode) => {
            const active = qtyMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setQtyMode(mode)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-bold capitalize transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
                )}
              >
                {mode}
              </button>
            )
          })}
        </div>
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
      </div>
    )
  }

  function updateFromLibrary(food: FoodDTO) {
    let quantity = 1
    
    if (qtyMode === "servings") {
      quantity = num(servings, 1) || 1
    } else {
      // weight mode: convert weight to servings based on serving size
      const weightValue = num(weight, 0)
      if (!food.servingSize || weightValue <= 0) {
        toast.error("Enter a weight and ensure the food has a serving size defined.")
        return
      }
      
      // Parse serving size (e.g., "100g" -> 100)
      const servingSizeMatch = food.servingSize.match(/^([\d.]+)/)
      const servingSizeValue = servingSizeMatch ? parseFloat(servingSizeMatch[1]) : null
      
      if (servingSizeValue === null || servingSizeValue <= 0) {
        toast.error("Food serving size is not properly defined.")
        return
      }
      
      quantity = weightValue / servingSizeValue
    }
    
    startTransition(async () => {
      await updateEntry(entry.id, {
        foodId: food.id,
        quantity,
      })
      toast.success(`Updated ${food.name}.`)
      onUpdated()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>Change the food item or adjust the serving size.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "library" | "quantity")} className="min-h-0">
          <TabsContent value="library" className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("quantity")}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground mb-2"
            >
              ← Back
            </button>
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search foods..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="-mx-1 max-h-72 overflow-y-auto px-1">
              {foods.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No foods saved yet. Add some in the Foods tab.
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No matches for "{query}".</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {filtered.map((food) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => updateFromLibrary(food)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {food.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                          ) : (
                            <Apple className="size-5 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{food.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {Math.round(food.calories)} kj · {Math.round(food.calories / KJ_PER_KCAL)} kcal · {Math.round(food.protein)}g protein
                            {food.servingSize ? ` · ${food.servingSize}` : ""}
                          </span>
                          <>
                            <ProteinScoreBadges proteinG={food.protein} kcal={Math.round(food.calories / KJ_PER_KCAL)} />
                            <CalorieDensityBadge
                              kcal={Math.round(food.calories / KJ_PER_KCAL)}
                              servingSize={food.servingSize}
                            />
                          </>
                        </span>
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quantity" className="mt-4 flex flex-col gap-4">
            {/* Food item display - stacked: thumb + name on top, macros below */}
            {(() => {
              const food = foods.find((f) => f.id === entry.foodId) ?? null
              const adjQty = round(adjustedNutrition.quantity, 1)
              const qtyLabel = adjQty % 1 === 0 ? String(Math.floor(adjQty)) : String(adjQty)
              return (
                <button
                  type="button"
                  onClick={() => setActiveTab("library")}
                  className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4 text-left transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-muted">
                      {food?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Apple className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-tight">{entry.name}</p>
                      <p className="text-[12px] text-faint">
                        {qtyLabel} serving{adjQty === 1 ? "" : "s"}
                        {food?.servingSize && <>{" − "}{food.servingSize}</>}
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
              )
            })()}

            {/* Quantity controls in single row */}
            <div className="flex flex-col gap-4">
              {renderQuantityControls()}
              
              {entry.foodId && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      const food = foods.find((f) => f.id === entry.foodId)
                      if (food) updateFromLibrary(food)
                    }}
                    disabled={pending}
                    className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    Save changes
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
