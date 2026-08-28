"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createMeal, updateMeal, type MealInput } from "@/app/actions/meals"
import type { FoodDTO, IngredientMode, MealDTO, MealIngredientDTO, ProfileDTO } from "@/lib/types"
import { ingredientNutrition, mealTotals } from "@/lib/meals"
import { parseServingUnit, parseServingWeight } from "@/lib/nutrition"
import { IngredientPickerDialog } from "@/components/meals/ingredient-picker-dialog"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ChevronLeft, ImagePlus, Loader2, Plus, Soup, X } from "lucide-react"

const KJ_PER_KCAL = 4.184

const ROW_GRID = "grid grid-cols-[44px_1fr_196px_104px_104px_56px_56px_80px_80px_28px] items-center gap-x-3"

type BuilderIngredient = {
  key: string
  foodId: number
  amount: string
  mode: IngredientMode
  name: string
  brand: string | null
  servingSize: string | null
  imageUrl: string | null
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
}

let localKey = 0
function makeKey() {
  localKey += 1
  return `ing-${localKey}-${Date.now()}`
}

function fromDto(i: MealIngredientDTO): BuilderIngredient {
  return {
    key: makeKey(),
    foodId: i.foodId,
    amount: String(i.amount),
    mode: i.mode,
    name: i.name,
    brand: i.brand,
    servingSize: i.servingSize,
    imageUrl: i.imageUrl,
    calories: i.calories,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
  }
}

function fromFood(f: FoodDTO): BuilderIngredient {
  return {
    key: makeKey(),
    foodId: f.id,
    amount: "1",
    mode: "serving",
    name: f.name,
    brand: f.brand,
    servingSize: f.servingSize,
    imageUrl: f.imageUrl,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
  }
}

// Build a calc-ready DTO from a builder ingredient (amount coerced to a number).
function toCalcDto(i: BuilderIngredient): MealIngredientDTO {
  return {
    id: 0,
    foodId: i.foodId,
    amount: Number(i.amount) || 0,
    mode: i.mode,
    sortOrder: 0,
    name: i.name,
    brand: i.brand,
    servingSize: i.servingSize,
    imageUrl: i.imageUrl,
    calories: i.calories,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
  }
}

export function MealBuilder({
  meal,
  foods,
  profile,
}: {
  meal: MealDTO | null
  foods: FoodDTO[]
  profile: ProfileDTO | null
}) {
  const router = useRouter()
  const isEdit = meal != null
  const [name, setName] = useState(meal?.name ?? "")
  const [imageUrl, setImageUrl] = useState<string | null>(meal?.imageUrl ?? null)
  const [ingredients, setIngredients] = useState<BuilderIngredient[]>(
    meal ? meal.ingredients.map(fromDto) : [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoMode, setPhotoMode] = useState<"upload" | "url">("upload")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const targetCalories = profile?.targetCalories ?? null
  const targetProtein = profile?.targetProtein ?? null

  const totals = mealTotals(ingredients.map(toCalcDto))
  const caloriesPct = targetCalories ? Math.round((totals.kcal / targetCalories) * 100) : null
  const proteinPct = targetProtein ? Math.round((totals.protein / targetProtein) * 100) : null

  const canSave = name.trim().length > 0 && ingredients.length > 0

  function addIngredient(food: FoodDTO) {
    setIngredients((prev) => [...prev, fromFood(food)])
  }

  function removeIngredient(key: string) {
    setIngredients((prev) => prev.filter((i) => i.key !== key))
  }

  function setAmount(key: string, amount: string) {
    setIngredients((prev) => prev.map((i) => (i.key === key ? { ...i, amount } : i)))
  }

  function setMode(key: string, mode: IngredientMode) {
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.key !== key || i.mode === mode) return i
        const servingWeight = parseServingWeight(i.servingSize)
        let amount = i.amount
        const value = Number(i.amount) || 0
        if (servingWeight && servingWeight > 0) {
          // Convert so the represented quantity stays roughly the same.
          amount =
            mode === "weight"
              ? String(Math.round(value * servingWeight * 10) / 10)
              : String(Math.round((value / servingWeight) * 100) / 100)
        }
        return { ...i, mode, amount }
      }),
    )
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large (max 10MB).")
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/foods/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = (await res.json()) as { url: string }
      setImageUrl(url)
      toast.success("Photo uploaded.")
    } catch (err) {
      console.log("[v0] Meal image upload failed:", err)
      toast.error("Upload failed. Try again.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function save() {
    if (!canSave || saving) return
    const input: MealInput = {
      name,
      imageUrl,
      ingredients: ingredients.map((i) => ({ foodId: i.foodId, amount: Number(i.amount) || 0, mode: i.mode })),
    }
    setSaving(true)
    void (async () => {
      try {
        if (meal) {
          await updateMeal(meal.id, input)
          toast.success("Meal updated.")
        } else {
          await createMeal(input)
          toast.success("Meal saved.")
        }
        router.push("/meals")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save meal.")
        setSaving(false)
      }
    })()
  }

  function cancel() {
    router.push("/meals")
  }

  const photoPopover = (sizeClass: string) => (
    <Popover>
      <PopoverTrigger
        aria-label="Edit meal photo"
        className={cn(
          "relative shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-opacity hover:opacity-90",
          sizeClass,
          imageUrl ? "bg-muted" : "border-2 border-dashed border-border/70 bg-transparent",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl || "/placeholder.svg"} alt="Meal preview" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-faint">
            <ImagePlus className="size-6" />
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-80">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setPhotoMode("upload")}
            className={cn(
              "h-9 rounded-lg text-sm font-semibold transition-colors",
              photoMode === "upload" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setPhotoMode("url")}
            className={cn(
              "h-9 rounded-lg text-sm font-semibold transition-colors",
              photoMode === "url" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Image URL
          </button>
        </div>
        <div className="mt-2.5">
          {photoMode === "upload" ? (
            <>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" id="meal-photo" />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-border/70 font-semibold"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <ImagePlus data-icon="inline-start" />}
                {uploading ? "Uploading..." : "Choose photo"}
              </Button>
            </>
          ) : (
            <Input
              type="url"
              placeholder="https://example.com/meal.jpg"
              defaultValue={imageUrl ?? ""}
              onChange={(e) => setImageUrl(e.target.value.trim() || null)}
              className="h-11 rounded-md border-0 bg-inset px-3.5 text-sm shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="mt-2 w-full text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
            >
              Remove photo
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )

  // Amount control: numeric box + Serv/{unit} segmented toggle.
  function amountControl(i: BuilderIngredient) {
    const unit = parseServingUnit(i.servingSize) ?? "g"
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          aria-label={`Amount for ${i.name}`}
          value={i.amount}
          onChange={(e) => setAmount(i.key, e.target.value)}
          className="h-9 w-14 rounded-md border-0 bg-inset px-2 text-center text-sm tabular-nums shadow-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="flex shrink-0 items-center rounded-full bg-inset p-1">
          <button
            type="button"
            onClick={() => setMode(i.key, "serving")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
              i.mode === "serving" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
            )}
          >
            Serv
          </button>
          <button
            type="button"
            onClick={() => setMode(i.key, "weight")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
              i.mode === "weight" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white",
            )}
          >
            {unit}
          </button>
        </div>
      </div>
    )
  }

  function ingredientThumb(i: BuilderIngredient, cls = "size-11") {
    return (
      <span className={cn(cls, "shrink-0 overflow-hidden rounded-[4px] bg-track")}>
        {i.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-faint">
            <Soup className="size-4" />
          </span>
        )}
      </span>
    )
  }

  function metaLine(i: BuilderIngredient) {
    const parts = [i.brand, i.servingSize ? `${i.servingSize} serving` : null].filter(Boolean)
    return parts.join(" · ")
  }

  const totalLabel = `${totals.weightG}g · ${totals.count} ingredient${totals.count === 1 ? "" : "s"} · summed from the ingredients below`

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-background px-4 md:hidden">
        <button type="button" onClick={cancel} className="flex items-center gap-1 text-[15px] font-bold text-muted-foreground">
          <ChevronLeft className="size-5" />
          Cancel
        </button>
        <span className="text-[15px] font-bold">{isEdit ? "Edit meal" : "New meal"}</span>
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <main className="mx-auto max-w-[1100px] px-4 py-6 pb-28 md:px-8 md:py-8">
        {/* Desktop header */}
        <div className="hidden md:block">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">
            Meals · {isEdit ? "Edit" : "New"}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.8px]">Build a meal</h1>
        </div>

        {/* Identity card */}
        <div className="mt-4 flex items-center gap-5 rounded-xl bg-card p-5 md:mt-8">
          {photoPopover("size-[84px] md:size-[84px]")}
          <div className="min-w-0 flex-1">
            <label htmlFor="meal-name" className="text-[11px] font-bold uppercase tracking-[.12em] text-faint">
              Name
            </label>
            <Input
              id="meal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fish & Rice Bowl"
              className="mt-1.5 h-12 rounded-md border-0 bg-inset px-4 text-base font-semibold shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </div>

        {/* Calculated total */}
        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-faint">
            Calculated total{" "}
            <span className="ml-1 font-medium normal-case tracking-normal text-muted-foreground">{totalLabel}</span>
          </p>

          {/* Desktop stat cards */}
          <div className="mt-3 hidden gap-4 md:grid md:grid-cols-4">
            <StatCard label="Calories" labelClass="text-stat-calories" value={totals.kcal} unit="kcal" sub={caloriesPct != null ? `${caloriesPct}% of day` : null}>
              <CalorieDensityBadge kcal={totals.kcal} servingSize={totals.weightG > 0 ? `${totals.weightG}g` : null} />
            </StatCard>
            <StatCard label="Protein" labelClass="text-stat-protein" value={totals.protein} unit="g" sub={proteinPct != null ? `${proteinPct}% of day` : null}>
              <ProteinScoreBadges proteinG={totals.protein} kcal={totals.kcal} />
            </StatCard>
            <StatCard label="Carbs" labelClass="text-stat-carbs" value={totals.carbs ?? "—"} unit="g" sub={null} />
            <StatCard label="Fat" labelClass="text-stat-fat" value={totals.fat ?? "—"} unit="g" sub={null} />
          </div>

          {/* Mobile single card */}
          <div className="mt-3 rounded-xl bg-card p-5 md:hidden">
            <div className="grid grid-cols-2 gap-4">
              <MobileStat label="Calories" labelClass="text-stat-calories" value={totals.kcal} unit="" sub={caloriesPct != null ? `${caloriesPct}% of day` : null}>
                <CalorieDensityBadge kcal={totals.kcal} servingSize={totals.weightG > 0 ? `${totals.weightG}g` : null} />
              </MobileStat>
              <MobileStat label="Protein" labelClass="text-stat-protein" value={totals.protein} unit="g" sub={proteinPct != null ? `${proteinPct}% of day` : null}>
                <ProteinScoreBadges proteinG={totals.protein} kcal={totals.kcal} />
              </MobileStat>
            </div>
            <div className="my-4 h-px bg-white/10" />
            <div className="grid grid-cols-2 gap-4">
              <MobileStat label="Carbs" labelClass="text-stat-carbs" value={totals.carbs ?? "—"} unit="g" sub={null} small />
              <MobileStat label="Fat" labelClass="text-stat-fat" value={totals.fat ?? "—"} unit="g" sub={null} small />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-faint">
            Ingredients
            <span className="float-right font-medium normal-case tracking-normal text-muted-foreground md:hidden">
              {ingredients.length} item{ingredients.length === 1 ? "" : "s"}
            </span>
          </p>

          {ingredients.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-muted-foreground">
              No ingredients yet. Add foods from your library to build this meal.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-3 hidden flex-col md:flex">
                <div
                  className={cn(
                    ROW_GRID,
                    "border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint",
                  )}
                >
                  <span />
                  <span>Food</span>
                  <span>Amount</span>
                  <span>Kcal</span>
                  <span>Protein</span>
                  <span>Carbs</span>
                  <span>Fat</span>
                  <span className="text-right">Kcal score</span>
                  <span className="text-right">P score</span>
                  <span />
                </div>
                <ul className="mt-1 flex flex-col">
                  {ingredients.map((i) => {
                    const n = ingredientNutrition(toCalcDto(i))
                    const perServingKcal = i.calories / KJ_PER_KCAL
                    const kcal = Math.round(n.kcal)
                    const protein = Math.round(n.protein)
                    const kcalPct = targetCalories ? Math.round((kcal / targetCalories) * 100) : null
                    const proteinPctRow = targetProtein ? Math.round((protein / targetProtein) * 100) : null
                    return (
                      <li key={i.key} className={cn(ROW_GRID, "group rounded-[4px] px-2 py-2.5 hover:bg-white/[0.06]")}>
                        {ingredientThumb(i)}
                        <div className="min-w-0">
                          <p className="max-w-full truncate text-[14px] font-semibold leading-tight">{i.name}</p>
                          {metaLine(i) && <p className="truncate text-[11.5px] text-faint">{metaLine(i)}</p>}
                        </div>
                        {amountControl(i)}
                        <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                          <MacroIcon macro="calories" />
                          {kcal}
                          {kcalPct != null ? <span className="font-normal text-faint">({kcalPct}%)</span> : null}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                          <MacroIcon macro="protein" />
                          {protein}
                          {proteinPctRow != null ? <span className="font-normal text-faint">({proteinPctRow}%)</span> : null}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                          <MacroIcon macro="carbs" />
                          {i.carbs != null ? Math.round(n.carbs) : "—"}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                          <MacroIcon macro="fat" />
                          {i.fat != null ? Math.round(n.fat) : "—"}
                        </span>
                        <div className="flex items-center justify-end">
                          <CalorieDensityBadge kcal={Math.round(perServingKcal)} servingSize={i.servingSize} />
                        </div>
                        <div className="flex items-center justify-end">
                          <ProteinScoreBadges proteinG={i.protein} kcal={perServingKcal} />
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeIngredient(i.key)}
                            aria-label={`Remove ${i.name}`}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Mobile cards */}
              <div className="mt-3 flex flex-col gap-3 md:hidden">
                {ingredients.map((i) => {
                  const n = ingredientNutrition(toCalcDto(i))
                  const perServingKcal = i.calories / KJ_PER_KCAL
                  const kcal = Math.round(n.kcal)
                  const protein = Math.round(n.protein)
                  const kcalPct = targetCalories ? Math.round((kcal / targetCalories) * 100) : null
                  const proteinPctRow = targetProtein ? Math.round((protein / targetProtein) * 100) : null
                  return (
                    <div key={i.key} className="flex flex-col gap-3 rounded-[10px] bg-card p-4">
                      <div className="flex items-start gap-3">
                        {ingredientThumb(i, "size-11")}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold leading-tight">{i.name}</p>
                          {metaLine(i) && <p className="truncate text-[11.5px] text-faint">{metaLine(i)}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIngredient(i.key)}
                          aria-label={`Remove ${i.name}`}
                          className="-mr-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {amountControl(i)}
                      <MacroBadges
                        kcal={kcal}
                        kcalPct={kcalPct}
                        protein={protein}
                        proteinPct={proteinPctRow}
                        carbs={i.carbs != null ? Math.round(n.carbs) : null}
                        fat={i.fat != null ? Math.round(n.fat) : null}
                      />
                      <div className="flex items-center gap-1.5">
                        <CalorieDensityBadge kcal={Math.round(perServingKcal)} servingSize={i.servingSize} />
                        <ProteinScoreBadges proteinG={i.protein} kcal={perServingKcal} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Add ingredient circle */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Add ingredient"
              className="flex size-10 items-center justify-center rounded-full border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        {/* Desktop footer */}
        <div className="mt-10 hidden items-center justify-end gap-4 md:flex">
          <button type="button" onClick={cancel} className="text-sm font-bold text-muted-foreground transition-colors hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
          >
            {saving ? "Saving…" : "Save meal"}
          </button>
        </div>
      </main>

      <IngredientPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} foods={foods} onAdd={addIngredient} />
    </>
  )
}

function StatCard({
  label,
  labelClass,
  value,
  unit,
  sub,
  children,
}: {
  label: string
  labelClass: string
  value: number | string
  unit: string
  sub: string | null
  children?: React.ReactNode
}) {
  return (
    <div className="relative rounded-xl bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-[11px] font-bold uppercase tracking-[.1em]", labelClass)}>{label}</span>
        {children}
      </div>
      <p className="mt-3 text-[34px] font-extrabold leading-none tracking-[-1px]">
        {value}
        <span className="ml-1 text-base font-semibold text-faint">{unit}</span>
      </p>
      {sub && <p className="mt-2 text-[12px] text-faint">{sub}</p>}
    </div>
  )
}

function MobileStat({
  label,
  labelClass,
  value,
  unit,
  sub,
  small,
  children,
}: {
  label: string
  labelClass: string
  value: number | string
  unit: string
  sub: string | null
  small?: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[11px] font-bold uppercase tracking-[.1em]", labelClass)}>{label}</span>
        {children}
      </div>
      <p className={cn("mt-1.5 font-extrabold leading-none tracking-[-0.5px]", small ? "text-2xl" : "text-[32px]")}>
        {value}
        <span className="ml-1 text-sm font-semibold text-faint">{unit}</span>
      </p>
      {sub && <p className="mt-1.5 text-[12px] text-faint">{sub}</p>}
    </div>
  )
}
