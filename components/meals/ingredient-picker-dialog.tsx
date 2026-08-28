"use client"

import { useMemo, useState, useTransition } from "react"
import useSWR from "swr"
import { createFood, getFavouriteFoods, getRecentFoods } from "@/app/actions/foods"
import type { FoodDTO } from "@/lib/types"
import { MacroBadges } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Clock, Loader2, Plus, Search, Star, UtensilsCrossed } from "lucide-react"

type TabKey = "library" | "favourites" | "recent" | "quick"
type ServingUnit = "g" | "ml"

const KJ_PER_KCAL = 4.184

const fieldInput =
  "h-11 rounded-md border-0 bg-inset px-3.5 text-sm shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
const fieldLabelClass = "text-sm font-semibold text-foreground"

export function IngredientPickerDialog({
  open,
  onOpenChange,
  foods,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  foods: FoodDTO[]
  onAdd: (food: FoodDTO) => void
}) {
  const [tab, setTab] = useState<TabKey>("library")
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [quick, setQuick] = useState({
    name: "",
    servingSize: "",
    unit: "g" as ServingUnit,
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q))
  }, [foods, query])

  const { data: recentFoods, isLoading: recentLoading } = useSWR(
    open && tab === "recent" ? "meal-recent-foods" : null,
    () => getRecentFoods(10),
  )
  const { data: favouriteFoods, isLoading: favouriteLoading } = useSWR(
    open && tab === "favourites" ? "meal-favourite-foods" : null,
    () => getFavouriteFoods(20),
  )

  function num(v: string, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) && v.trim() !== "" ? n : fallback
  }

  function add(food: FoodDTO) {
    onAdd(food)
    toast.success(`Added ${food.name}.`)
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quick.name.trim()) {
      toast.error("Enter a name for the ingredient.")
      return
    }
    startTransition(async () => {
      try {
        const created = await createFood({
          name: quick.name,
          servingSize: quick.servingSize.trim() ? `${quick.servingSize.trim()}${quick.unit}` : null,
          calories: num(quick.calories) * KJ_PER_KCAL,
          protein: num(quick.protein),
          carbs: quick.carbs.trim() === "" ? null : num(quick.carbs),
          fat: quick.fat.trim() === "" ? null : num(quick.fat),
        })
        onAdd(created)
        toast.success(`Added ${created.name} to your library and this meal.`)
        setQuick({ name: "", servingSize: "", unit: "g", calories: "", protein: "", carbs: "", fat: "" })
      } catch {
        toast.error("Could not create the ingredient.")
      }
    })
  }

  function renderList(list: FoodDTO[]) {
    if (list.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">No foods to show.</p>
    }
    return (
      <ul className="flex flex-col">
        {list.map((food) => {
          const kcal = Math.round(food.calories / KJ_PER_KCAL)
          return (
            <li key={food.id} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-tight">{food.name}</p>
                {(food.brand || food.servingSize) && (
                  <p className="truncate text-[11.5px] text-faint">
                    {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="mt-1.5">
                  <MacroBadges kcal={kcal} protein={food.protein} carbs={food.carbs} fat={food.fat} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => add(food)}
                aria-label={`Add ${food.name}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88svh] max-h-[88svh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.5px]">Add ingredient</DialogTitle>
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

        {tab === "library" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-12 w-full rounded-full bg-inset pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-inset-hover focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Search foods..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{renderList(filtered)}</div>
          </div>
        )}

        {tab === "favourites" && (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {favouriteLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : !favouriteFoods || favouriteFoods.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                <Star className="size-6" />
                <p className="max-w-xs text-pretty">No favourites yet. Tag foods as favourites in your library.</p>
              </div>
            ) : (
              renderList(favouriteFoods)
            )}
          </div>
        )}

        {tab === "recent" && (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {recentLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : !recentFoods || recentFoods.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                <Clock className="size-6" />
                <p className="max-w-xs text-pretty">No recently logged foods yet.</p>
              </div>
            ) : (
              renderList(recentFoods)
            )}
          </div>
        )}

        {tab === "quick" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <form onSubmit={submitQuick}>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="mi-name" className={fieldLabelClass}>
                      Name
                    </FieldLabel>
                    <Input
                      id="mi-name"
                      value={quick.name}
                      onChange={(e) => setQuick((s) => ({ ...s, name: e.target.value }))}
                      placeholder="e.g. Banana"
                      className={fieldInput}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="mi-serving" className={fieldLabelClass}>
                      Serving Size
                    </FieldLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        id="mi-serving"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={quick.servingSize}
                        onChange={(e) => setQuick((s) => ({ ...s, servingSize: e.target.value }))}
                        placeholder="e.g. 100"
                        className={fieldInput}
                      />
                      <div className="flex shrink-0 items-center rounded-full bg-inset p-1">
                        {(["g", "ml"] as ServingUnit[]).map((unit) => {
                          const active = quick.unit === unit
                          return (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => setQuick((s) => ({ ...s, unit }))}
                              className={cn(
                                "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
                              )}
                            >
                              {unit}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      { key: "calories", label: "Calories" },
                      { key: "protein", label: "Protein" },
                      { key: "carbs", label: "Carbs" },
                      { key: "fat", label: "Fat" },
                    ] as { key: keyof typeof quick; label: string }[]
                  ).map((f) => (
                    <Field key={f.key}>
                      <FieldLabel htmlFor={`mi-${f.key}`} className={fieldLabelClass}>
                        {f.label}
                      </FieldLabel>
                      <Input
                        id={`mi-${f.key}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={quick[f.key] as string}
                        onChange={(e) => setQuick((s) => ({ ...s, [f.key]: e.target.value }))}
                        placeholder="0"
                        className={fieldInput}
                      />
                    </Field>
                  ))}
                </div>
                <div className="flex justify-center pt-2">
                  <Button
                    type="submit"
                    disabled={pending}
                    className="rounded-full bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
                  >
                    {pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
                    Add ingredient
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
