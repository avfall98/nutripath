"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { createFood, updateFood, type FoodInput } from "@/app/actions/foods"
import type { FoodDTO } from "@/lib/types"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { round } from "@/lib/format"
import { toast } from "sonner"
import { ImagePlus, Link2, Loader2, X } from "lucide-react"

const KJ_PER_KCAL = 4.184
type ServingUnit = "g" | "ml"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  food: FoodDTO | null
  onSaved: () => void
}

const empty = {
  name: "",
  brand: "",
  servingSize: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  saturatedFat: "",
  sugars: "",
  dietaryFiber: "",
  sodium: "",
  caloriesPerHundred: "",
  proteinPerHundred: "",
  carbsPerHundred: "",
  fatPerHundred: "",
  saturatedFatPerHundred: "",
  sugarsPerHundred: "",
  dietaryFiberPerHundred: "",
  sodiumPerHundred: "",
  infoUrl: "",
}

export function FoodFormDialog({ open, onOpenChange, food, onSaved }: Props) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [servingUnit, setServingUnit] = useState<ServingUnit>("g")
  const [form, setForm] = useState(empty)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Parse servingSize to extract number and unit
      let servingNum = ""
      let unit: ServingUnit = "g"
      if (food?.servingSize) {
        const match = food.servingSize.match(/^([\d.]+)\s*(g|ml)$/i)
        if (match) {
          servingNum = match[1]
          unit = (match[2].toLowerCase() as ServingUnit) || "g"
        } else {
          // Fallback: treat entire string as serving size if no unit found
          servingNum = food.servingSize
        }
      }
      
      setForm({
        name: food?.name ?? "",
        brand: food?.brand ?? "",
        servingSize: servingNum,
        calories: food?.calories != null ? String(food.calories) : "",
        protein: food?.protein != null ? String(food.protein) : "",
        carbs: food?.carbs != null ? String(food.carbs) : "",
        fat: food?.fat != null ? String(food.fat) : "",
        saturatedFat: food?.saturatedFat != null ? String(food.saturatedFat) : "",
        sugars: food?.sugars != null ? String(food.sugars) : "",
        dietaryFiber: food?.dietaryFiber != null ? String(food.dietaryFiber) : "",
        sodium: food?.sodium != null ? String(food.sodium) : "",
        caloriesPerHundred: food?.caloriesPerHundred != null ? String(food.caloriesPerHundred) : "",
        proteinPerHundred: food?.proteinPerHundred != null ? String(food.proteinPerHundred) : "",
        carbsPerHundred: food?.carbsPerHundred != null ? String(food.carbsPerHundred) : "",
        fatPerHundred: food?.fatPerHundred != null ? String(food.fatPerHundred) : "",
        saturatedFatPerHundred: food?.saturatedFatPerHundred != null ? String(food.saturatedFatPerHundred) : "",
        sugarsPerHundred: food?.sugarsPerHundred != null ? String(food.sugarsPerHundred) : "",
        dietaryFiberPerHundred: food?.dietaryFiberPerHundred != null ? String(food.dietaryFiberPerHundred) : "",
        sodiumPerHundred: food?.sodiumPerHundred != null ? String(food.sodiumPerHundred) : "",
        infoUrl: food?.infoUrl ?? "",
      })
      setImageUrl(food?.imageUrl ?? null)
      setServingUnit(unit)
    }
  }, [open, food])

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => {
      const updated = { ...f, [key]: value }
      
      // Map of per-100g fields to per-serving fields
      const syncMap: Record<string, string> = {
        caloriesPerHundred: "calories",
        proteinPerHundred: "protein",
        carbsPerHundred: "carbs",
        fatPerHundred: "fat",
        saturatedFatPerHundred: "saturatedFat",
        sugarsPerHundred: "sugars",
        dietaryFiberPerHundred: "dietaryFiber",
        sodiumPerHundred: "sodium",
      }
      
      // Case 1: User is editing a per-100g value
      // Auto-sync per-serving values from per-100g values
      const servingSizeNum = num(f.servingSize)
      if (servingSizeNum && servingSizeNum > 0) {
        const multiplier = servingSizeNum / 100
        
        if (syncMap[key as string]) {
          const per100Value = num(value)
          if (per100Value !== null) {
            const perServingValue = round(per100Value * multiplier, 1)
            updated[syncMap[key as string] as K] = String(perServingValue)
          }
        }
      }
      
      // Case 2: User is editing serving size
      // Recalculate all per-serving values based on per-100g values
      if (key === "servingSize") {
        const newServingSizeNum = num(value)
        if (newServingSizeNum && newServingSizeNum > 0) {
          const multiplier = newServingSizeNum / 100
          
          // Recalculate all per-serving values
          Object.entries(syncMap).forEach(([per100Key, perServingKey]) => {
            const per100Value = num(f[per100Key as keyof typeof f] as string)
            if (per100Value !== null) {
              const perServingValue = round(per100Value * multiplier, 1)
              updated[perServingKey as K] = String(perServingValue)
            }
          })
        }
      }
      
      return updated
    })
  }

  function num(v: string): number | null {
    if (v.trim() === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
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
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Upload failed")
      }
      const { url } = (await res.json()) as { url: string }
      setImageUrl(url)
      toast.success("Photo uploaded.")
    } catch (err) {
      console.log("[v0] Food image upload failed:", err)
      toast.error("Upload failed. Try again.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Give the food a name.")
      return
    }
    const servingSize = form.servingSize.trim() ? `${form.servingSize}${servingUnit}` : ""
    const input: FoodInput = {
      name: form.name,
      brand: form.brand,
      servingSize,
      calories: num(form.calories),
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
      saturatedFat: num(form.saturatedFat),
      sugars: num(form.sugars),
      dietaryFiber: num(form.dietaryFiber),
      sodium: num(form.sodium),
      caloriesPerHundred: num(form.caloriesPerHundred),
      proteinPerHundred: num(form.proteinPerHundred),
      carbsPerHundred: num(form.carbsPerHundred),
      fatPerHundred: num(form.fatPerHundred),
      saturatedFatPerHundred: num(form.saturatedFatPerHundred),
      sugarsPerHundred: num(form.sugarsPerHundred),
      dietaryFiberPerHundred: num(form.dietaryFiberPerHundred),
      sodiumPerHundred: num(form.sodiumPerHundred),
      imageUrl,
      infoUrl: form.infoUrl,
    }
    startTransition(async () => {
      if (food) {
        await updateFood(food.id, input)
        toast.success("Food updated.")
      } else {
        await createFood(input)
        toast.success("Food added to your library.")
      }
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{food ? "Edit food" : "Add a food"}</DialogTitle>
          <DialogDescription>
            Save foods you eat often with their nutrition, a photo, and a reference link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl || "/placeholder.svg"} alt="Food preview" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="size-6" />
                </div>
              )}
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <Tabs defaultValue="upload">
                <TabsList className="w-full">
                  <TabsTrigger value="upload" className="flex-1">
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex-1">
                    Image URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                    id="food-photo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ImagePlus data-icon="inline-start" />
                    )}
                    {uploading ? "Uploading..." : "Choose photo"}
                  </Button>
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <Input
                    type="url"
                    placeholder="https://example.com/food.jpg"
                    value={imageUrl ?? ""}
                    onChange={(e) => setImageUrl(e.target.value || null)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="food-name">Name</FieldLabel>
              <Input
                id="food-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Greek yogurt"
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="food-brand">Brand (optional)</FieldLabel>
                <Input
                  id="food-brand"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="e.g. Chobani"
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="food-serving">Serving size</FieldLabel>
                  <ToggleGroup
                    value={[servingUnit]}
                    onValueChange={(v) => {
                      const next = v[0] as ServingUnit | undefined
                      if (next) setServingUnit(next)
                    }}
                    size="sm"
                    variant="outline"
                    spacing={0}
                  >
                    <ToggleGroupItem value="g" aria-label="Grams">
                      g
                    </ToggleGroupItem>
                    <ToggleGroupItem value="ml" aria-label="Milliliters">
                      ml
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <Input
                  id="food-serving"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.servingSize}
                  onChange={(e) => set("servingSize", e.target.value)}
                  placeholder="e.g. 100"
                />
              </Field>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Nutrition Information</h3>
              
              {/* Nutrition table */}
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-sm font-semibold text-foreground bg-muted/30">Nutrient</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-foreground bg-muted/30">Per serving</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-foreground bg-muted/30">Per 100{servingUnit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Energy */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Energy (kJ)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.calories}
                          onChange={(e) => set("calories", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.caloriesPerHundred}
                          onChange={(e) => set("caloriesPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Calories (read-only, auto-calculated from kJ) */}
                    <tr className="border-b border-border bg-muted/20">
                      <td className="px-3 py-2 text-sm text-muted-foreground">Calories (kcal)</td>
                      <td className="px-3 py-2">
                        <div className="h-8 flex items-center justify-center text-sm text-muted-foreground">
                          {form.calories ? round(Number(form.calories) / KJ_PER_KCAL, 1) : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-8 flex items-center justify-center text-sm text-muted-foreground">
                          {form.caloriesPerHundred ? round(Number(form.caloriesPerHundred) / KJ_PER_KCAL, 1) : "—"}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Protein */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Protein (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.protein}
                          onChange={(e) => set("protein", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.proteinPerHundred}
                          onChange={(e) => set("proteinPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Fat */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Fat (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.fat}
                          onChange={(e) => set("fat", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.fatPerHundred}
                          onChange={(e) => set("fatPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Saturated Fat (child of Fat) */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm text-foreground pl-8">— Saturated (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.saturatedFat}
                          onChange={(e) => set("saturatedFat", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.saturatedFatPerHundred}
                          onChange={(e) => set("saturatedFatPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Carbs */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Carbs (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.carbs}
                          onChange={(e) => set("carbs", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.carbsPerHundred}
                          onChange={(e) => set("carbsPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Sugars (child of Carbs) */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm text-foreground pl-8">— Sugars (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.sugars}
                          onChange={(e) => set("sugars", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.sugarsPerHundred}
                          onChange={(e) => set("sugarsPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Dietary Fibre */}
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Dietary Fibre (g)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.dietaryFiber}
                          onChange={(e) => set("dietaryFiber", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.dietaryFiberPerHundred}
                          onChange={(e) => set("dietaryFiberPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                    
                    {/* Sodium */}
                    <tr>
                      <td className="px-3 py-2 text-sm font-medium text-foreground">Sodium (mg)</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.sodium}
                          onChange={(e) => set("sodium", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={form.sodiumPerHundred}
                          onChange={(e) => set("sodiumPerHundred", e.target.value)}
                          placeholder="0"
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Protein Score Preview */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Protein Quality</h4>
              <div className="flex flex-col gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">Per serving:</p>
                  <>
                    <ProteinScoreBadges 
                      proteinG={Number(form.protein) || 0}
                      kcal={form.calories ? Number(form.calories) / KJ_PER_KCAL : 0}
                    />
                    <CalorieDensityBadge
                      kcal={form.calories ? Number(form.calories) / KJ_PER_KCAL : 0}
                      servingSize={form.servingSize ? `${form.servingSize}${servingUnit}` : null}
                    />
                  </>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Per 100{servingUnit}:</p>
                  <ProteinScoreBadges 
                    proteinG={Number(form.proteinPerHundred) || 0}
                    kcal={form.caloriesPerHundred ? Number(form.caloriesPerHundred) / KJ_PER_KCAL : 0}
                  />
                </div>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="food-url">Reference link (optional)</FieldLabel>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="food-url"
                  type="url"
                  className="pl-9"
                  value={form.infoUrl}
                  onChange={(e) => set("infoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Saving..." : food ? "Save changes" : "Add food"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
