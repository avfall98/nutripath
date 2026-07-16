"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { createFood, updateFood, uploadFoodImage, type FoodInput } from "@/app/actions/foods"
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
import { toast } from "sonner"
import { ImagePlus, Link2, Loader2, X } from "lucide-react"

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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const fileRef = useRef<HTMLInputElement>(null)

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
    }
  }, [open, food])

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="food-cal">Calories</FieldLabel>
                <Input
                  id="food-cal"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.calories}
                  onChange={(e) => set("calories", e.target.value)}
                  placeholder="kcal"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="food-pro">Protein</FieldLabel>
                <Input
                  id="food-pro"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.protein}
                  onChange={(e) => set("protein", e.target.value)}
                  placeholder="g"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="food-carb">Carbs</FieldLabel>
                <Input
                  id="food-carb"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.carbs}
                  onChange={(e) => set("carbs", e.target.value)}
                  placeholder="g"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="food-fat">Fat</FieldLabel>
                <Input
                  id="food-fat"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.fat}
                  onChange={(e) => set("fat", e.target.value)}
                  placeholder="g"
                />
              </Field>
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
