"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { createFood, updateFood, uploadFoodImage, type FoodInput } from "@/app/actions/foods"
import { extractFoodMetadata } from "@/app/actions/extract-food-metadata"
import type { FoodDTO } from "@/lib/types"
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
import { ImagePlus, Link2, Loader2, X, Sparkles } from "lucide-react"

const KJ_PER_KCAL = 4.184
type EnergyUnit = "kcal" | "kj"

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
  infoUrl: "",
}

export function FoodFormDialog({ open, onOpenChange, food, onSaved }: Props) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>("kcal")
  const [form, setForm] = useState(empty)
  const fileRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (open) {
      setForm({
        name: food?.name ?? "",
        brand: food?.brand ?? "",
        servingSize: food?.servingSize ?? "",
        calories: food?.calories != null ? String(food.calories) : "",
        protein: food?.protein != null ? String(food.protein) : "",
        carbs: food?.carbs != null ? String(food.carbs) : "",
        fat: food?.fat != null ? String(food.fat) : "",
        infoUrl: food?.infoUrl ?? "",
      })
      setImageUrl(food?.imageUrl ?? null)
      setEnergyUnit("kcal")
    }
  }, [open, food])

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // form.calories is always stored in kcal (source of truth). The energy input
  // shows and accepts values in the currently selected unit.
  const energyDisplay =
    form.calories === ""
      ? ""
      : energyUnit === "kcal"
        ? form.calories
        : String(round(Number(form.calories) * KJ_PER_KCAL, 0))

  function setEnergy(value: string) {
    if (value.trim() === "") return set("calories", "")
    if (energyUnit === "kcal") return set("calories", value)
    const n = Number(value)
    if (!Number.isFinite(n)) return set("calories", "")
    set("calories", String(round(n / KJ_PER_KCAL, 2)))
  }

  async function extractMetadata(url: string) {
    if (!url || !url.startsWith("http")) return

    setExtracting(true)
    try {
      const data = await extractFoodMetadata(url)

      const kcal =
        data.calories != null
          ? round(data.calories, 1)
          : data.energyKj != null
            ? round(data.energyKj / KJ_PER_KCAL, 1)
            : null

      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        brand: data.brand || f.brand,
        calories: kcal != null && !f.calories ? String(kcal) : f.calories,
        protein: data.protein != null && !f.protein ? String(data.protein) : f.protein,
        carbs: data.carbs != null && !f.carbs ? String(data.carbs) : f.carbs,
        fat: data.fat != null && !f.fat ? String(data.fat) : f.fat,
        servingSize: data.servingSize || f.servingSize,
      }))

      if (data.imageUrl && !imageUrl) {
        setImageUrl(data.imageUrl)
      }

      if (data.name || kcal != null || data.protein != null) {
        toast.success("Details pulled from the link. Review and edit before saving.")
      } else {
        toast.info("Could not read nutrition from that link. Enter details manually.")
      }
    } catch (error) {
      console.error("[v0] Extraction failed:", error)
    } finally {
      setExtracting(false)
    }
  }

  function handleInfoUrlChange(value: string) {
    set("infoUrl", value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value && value.startsWith("http")) {
        extractMetadata(value)
      }
    }, 1500)
  }

  function num(v: string): number | null {
    if (v.trim() === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const { url } = await uploadFoodImage(fd)
      setImageUrl(url)
      toast.success("Photo uploaded.")
    } catch {
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
    const input: FoodInput = {
      name: form.name,
      brand: form.brand,
      servingSize: form.servingSize,
      calories: num(form.calories),
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
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
                <FieldLabel htmlFor="food-serving">Serving size</FieldLabel>
                <Input
                  id="food-serving"
                  value={form.servingSize}
                  onChange={(e) => set("servingSize", e.target.value)}
                  placeholder="e.g. 170g / 1 cup"
                />
              </Field>
            </div>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="food-cal">Energy</FieldLabel>
                <ToggleGroup
                  value={[energyUnit]}
                  onValueChange={(v) => {
                    const next = v[0] as EnergyUnit | undefined
                    if (next) setEnergyUnit(next)
                  }}
                  size="sm"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem value="kcal" aria-label="Calories in kcal">
                    kcal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="kj" aria-label="Energy in kilojoules">
                    kJ
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <Input
                id="food-cal"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={energyDisplay}
                onChange={(e) => setEnergy(e.target.value)}
                placeholder={energyUnit === "kcal" ? "kcal per serving" : "kJ per serving"}
              />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="food-pro">Protein (g)</FieldLabel>
                <Input
                  id="food-pro"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.protein}
                  onChange={(e) => set("protein", e.target.value)}
                  placeholder="g"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="food-carb">Carbs (g)</FieldLabel>
                <Input
                  id="food-carb"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.carbs}
                  onChange={(e) => set("carbs", e.target.value)}
                  placeholder="g"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="food-fat">Fat (g)</FieldLabel>
                <Input
                  id="food-fat"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.fat}
                  onChange={(e) => set("fat", e.target.value)}
                  placeholder="g"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="food-url">Reference link (optional)</FieldLabel>
              <div className="relative">
                {extracting ? (
                  <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
                ) : (
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  id="food-url"
                  type="url"
                  className="pl-9"
                  value={form.infoUrl}
                  onChange={(e) => handleInfoUrlChange(e.target.value)}
                  placeholder="https://..."
                  disabled={extracting}
                />
                {extracting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="size-3" />
                    Extracting
                  </div>
                )}
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
