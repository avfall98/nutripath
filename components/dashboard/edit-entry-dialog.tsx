"use client"

import { useMemo, useState, useTransition } from "react"
import { updateEntry } from "@/app/actions/entries"
import type { EntryDTO, FoodDTO } from "@/lib/types"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
      <DialogContent className="max-h-[90svh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>Change the food item or adjust the serving size.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">
              Change food
            </TabsTrigger>
            <TabsTrigger value="quantity" className="flex-1">
              Quantity only
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 flex flex-col gap-3">
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {qtyMode === "servings" ? "Servings" : "Weight"}
                </label>
                <ToggleGroup
                  value={[qtyMode]}
                  onValueChange={(v) => {
                    const mode = v[0] as QuantityMode | undefined
                    if (mode) setQtyMode(mode)
                  }}
                  size="sm"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem value="servings" aria-label="Servings">
                    Servings
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weight" aria-label="Weight">
                    Weight
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            
            <div className="flex items-end gap-3">
              {qtyMode === "servings" ? (
                <div className="flex-1">
                  <label htmlFor="lib-servings" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Servings
                  </label>
                  <Input
                    id="lib-servings"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="1.0"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <label htmlFor="lib-weight" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Weight
                    </label>
                    <Input
                      id="lib-weight"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setWeightUnit("g")}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        weightUnit === "g"
                          ? "bg-accent text-accent-foreground"
                          : "border border-border hover:bg-accent/50"
                      }`}
                    >
                      g
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit("ml")}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        weightUnit === "ml"
                          ? "bg-accent text-accent-foreground"
                          : "border border-border hover:bg-accent/50"
                      }`}
                    >
                      ml
                    </button>
                  </div>
                </>
              )}
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
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <ProteinScoreBadges proteinG={food.protein} kcal={Math.round(food.calories / KJ_PER_KCAL)} />
                            <CalorieDensityBadge
                              kcal={Math.round(food.calories / KJ_PER_KCAL)}
                              servingSize={food.servingSize}
                            />
                          </div>
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
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{entry.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(entry.calories / KJ_PER_KCAL)} kcal · {Math.round(entry.protein)}g protein
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {qtyMode === "servings" ? "Servings" : "Weight"}
                </label>
                <ToggleGroup
                  value={[qtyMode]}
                  onValueChange={(v) => {
                    const mode = v[0] as QuantityMode | undefined
                    if (mode) setQtyMode(mode)
                  }}
                  size="sm"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem value="servings" aria-label="Servings">
                    Servings
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weight" aria-label="Weight">
                    Weight
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {qtyMode === "servings" ? (
                <div>
                  <label htmlFor="qty-servings" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Servings
                  </label>
                  <Input
                    id="qty-servings"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="qty-weight" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Weight
                    </label>
                    <Input
                      id="qty-weight"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setWeightUnit("g")}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        weightUnit === "g"
                          ? "bg-accent text-accent-foreground"
                          : "border border-border hover:bg-accent/50"
                      }`}
                    >
                      g
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit("ml")}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        weightUnit === "ml"
                          ? "bg-accent text-accent-foreground"
                          : "border border-border hover:bg-accent/50"
                      }`}
                    >
                      ml
                    </button>
                  </div>
                </>
              )}

              {entry.foodId && (
                <Button
                  onClick={() => {
                    const food = foods.find((f) => f.id === entry.foodId)
                    if (food) updateFromLibrary(food)
                  }}
                  disabled={pending}
                  className="w-full"
                >
                  Save changes
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
