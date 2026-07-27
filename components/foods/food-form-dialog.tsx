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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { round } from "@/lib/format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BarcodeScanner } from "@/components/foods/barcode-scanner"
import { ArrowDown, Download, ImagePlus, Link2, Loader2, Plus, ScanBarcode, X } from "lucide-react"

type ImportedProduct = {
  name: string
  brand: string
  imageUrl: string | null
  infoUrl: string
  servingSize: string
  servingUnit: ServingUnit
  servingsPack: string | null
  packSize: string | null
  caloriesKj: number | null
  protein: number | null
  fat: number | null
  saturatedFat: number | null
  carbs: number | null
  sugars: number | null
  dietaryFiber: number | null
  sodium: number | null
  caloriesKjPer100: number | null
  proteinPer100: number | null
  fatPer100: number | null
  saturatedFatPer100: number | null
  carbsPer100: number | null
  sugarsPer100: number | null
  dietaryFiberPer100: number | null
  sodiumPer100: number | null
}

type LookupSource = "woolworths" | "openfoodfacts"

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
  servingsPack: "",
  packSize: "",
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
  const [importing, setImporting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importQuery, setImportQuery] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [source, setSource] = useState<LookupSource | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [servingUnit, setServingUnit] = useState<ServingUnit>("g")
  const [photoMode, setPhotoMode] = useState<"upload" | "url">("upload")
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
      
      // Parse packSize to extract number (same unit as servingSize)
      let packNum = ""
      if (food?.packSize) {
        const match = food.packSize.match(/^([\d.]+)\s*(g|ml)$/i)
        if (match) {
          packNum = match[1]
        } else {
          // Fallback: treat entire string as pack size if no unit found
          packNum = food.packSize
        }
      }
      
      setForm({
        name: food?.name ?? "",
        brand: food?.brand ?? "",
        servingSize: servingNum,
        servingsPack: food?.servingsPack ?? "",
        packSize: packNum,
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
      setImportQuery("")
      setSource(null)
      setShowImport(false)
    }
  }, [open, food, pending])

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
      
      // Case 3: User is editing servings per pack
      // Auto-calculate pack size as servingsPack × servingSize
      if (key === "servingsPack") {
        const servingsPackNum = num(value)
        const servingSizeNum = num(f.servingSize)
        if (servingsPackNum !== null && servingSizeNum && servingSizeNum > 0) {
          const packSizeNum = round(servingsPackNum * servingSizeNum, 1)
          updated.packSize = String(packSizeNum === Math.floor(packSizeNum) ? Math.floor(packSizeNum) : packSizeNum)
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

  /** Populate the form from a looked-up product payload. */
  function applyProduct(p: ImportedProduct, foundSource: LookupSource | null) {
    const s = (v: number | null | undefined) => (v != null ? String(v) : "")

    setForm((f) => ({
      ...f,
      name: p.name || f.name,
      brand: p.brand || f.brand,
      servingSize: p.servingSize || f.servingSize,
      servingsPack: p.servingsPack || f.servingsPack,
      packSize: p.packSize || f.packSize,
      calories: s(p.caloriesKj),
      protein: s(p.protein),
      fat: s(p.fat),
      saturatedFat: s(p.saturatedFat),
      carbs: s(p.carbs),
      sugars: s(p.sugars),
      dietaryFiber: s(p.dietaryFiber),
      sodium: s(p.sodium),
      caloriesPerHundred: s(p.caloriesKjPer100),
      proteinPerHundred: s(p.proteinPer100),
      fatPerHundred: s(p.fatPer100),
      saturatedFatPerHundred: s(p.saturatedFatPer100),
      carbsPerHundred: s(p.carbsPer100),
      sugarsPerHundred: s(p.sugarsPer100),
      dietaryFiberPerHundred: s(p.dietaryFiberPer100),
      sodiumPerHundred: s(p.sodiumPer100),
      infoUrl: p.infoUrl || f.infoUrl,
    }))
    if (p.servingUnit) setServingUnit(p.servingUnit)
    if (p.imageUrl) setImageUrl(p.imageUrl)
    setSource(foundSource)
  }

  async function handleImport() {
    const query = importQuery.trim()
    if (!query) {
      toast.error("Paste a Woolworths product URL or stockcode.")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/woolies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? "Import failed")
      }
      applyProduct(data.product as ImportedProduct, "woolworths")
      toast.success("Product details imported successfully!")
    } catch (err) {
      console.log("[v0] Woolworths import failed:", err)
      toast.error(
        err instanceof Error && err.message !== "Import failed"
          ? err.message
          : "Failed to fetch Woolworths product. Please check the URL.",
      )
    } finally {
      setImporting(false)
    }
  }

  async function handleBarcodeDetected(barcode: string) {
    setScanning(true)
    const pending = toast.loading(`Looking up barcode ${barcode}...`)
    try {
      const res = await fetch("/api/food/lookup-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? "Barcode lookup failed")
      }
      const product = data.product as ImportedProduct & { source: LookupSource }
      applyProduct(product, product.source)
      toast.success(
        product.source === "woolworths"
          ? "Found on Woolworths and filled in the details."
          : "Found on Open Food Facts and filled in the details.",
        { id: pending },
      )
    } catch (err) {
      console.log("[v0] Barcode lookup failed:", err)
      toast.error(
        err instanceof Error && err.message !== "Barcode lookup failed"
          ? err.message
          : "Product barcode not found. Try entering URL or manual entry.",
        { id: pending },
      )
    } finally {
      setScanning(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Give the food a name.")
      return
    }
    const servingSize = form.servingSize.trim() ? `${form.servingSize}${servingUnit}` : ""
    const packSize = form.packSize.trim() ? `${form.packSize}${servingUnit}` : ""
    const input: FoodInput = {
      name: form.name,
      brand: form.brand,
      servingSize,
      servingsPack: form.servingsPack || null,
      packSize: packSize || null,
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
      try {
        if (food) {
          await updateFood(food.id, input)
          toast.success("Food updated.")
        } else {
          await createFood(input)
          toast.success("Food added to your library.")
        }
      } finally {
        onOpenChange(false)
        onSaved()
      }
    })
  }

  const fieldInput =
    "h-11 rounded-md border-0 bg-inset px-3.5 text-sm shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
  const cellInput =
    "h-10 rounded-md border-0 bg-inset px-3 text-right text-sm tabular-nums shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
  const labelClass = "text-sm font-semibold text-foreground"
  const gridCols =
    "grid grid-cols-[1fr_minmax(0,6rem)_minmax(0,6rem)] gap-3 sm:grid-cols-[1fr_minmax(0,9rem)_minmax(0,9rem)] sm:gap-4"

  type NutrientKey = keyof typeof empty
  const renderNutrientRow = (
    label: string,
    servingKey: NutrientKey,
    hundredKey: NutrientKey,
    indent = false,
  ) => (
    <div key={label} className={cn(gridCols, "items-center border-t border-border/40 py-2.5")}>
      <span className={cn("text-sm", indent ? "pl-4 text-muted-foreground" : "font-medium text-foreground")}>
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={form[servingKey]}
        onChange={(e) => set(servingKey, e.target.value)}
        placeholder="0"
        className={cellInput}
      />
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={form[hundredKey]}
        onChange={(e) => set(hundredKey, e.target.value)}
        placeholder="0"
        className={cellInput}
      />
    </div>
  )

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-h-[92svh] gap-0 overflow-y-auto rounded-2xl p-6 ring-0 sm:max-w-3xl sm:p-8"
        >
        <DialogHeader className="mb-6 pr-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {food ? "Edit food" : "Add a food"}
              </DialogTitle>
              <DialogDescription>
                Save foods you eat often with their nutrition, a photo, and a reference link.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant={showImport ? "default" : "outline"}
              size="sm"
              aria-pressed={showImport}
              onClick={() => setShowImport((v) => !v)}
              className="h-9 shrink-0 rounded-xl px-4 font-semibold"
            >
              <Download data-icon="inline-start" />
              Import
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">


            {showImport && (
            <div className="rounded-lg bg-inset p-4 sm:p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <ArrowDown className="size-4" />
                Import from Woolworths
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Input
                  id="woolies-import"
                  value={importQuery}
                  onChange={(e) => setImportQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      e.preventDefault()
                      handleImport()
                    }
                  }}
                  placeholder="Woolworths product URL or stockcode"
                  disabled={importing || scanning}
                  className={cn(fieldInput, "flex-1 bg-background/60")}
                />
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-xl px-5 font-semibold sm:flex-none"
                    onClick={handleImport}
                    disabled={importing || scanning}
                  >
                    {importing ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                    {importing ? "Importing..." : "Import"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-border/70 px-5 font-semibold sm:flex-none"
                    onClick={() => setScannerOpen(true)}
                    disabled={importing || scanning}
                  >
                    {scanning ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ScanBarcode data-icon="inline-start" />
                    )}
                    {scanning ? "Looking up..." : "Scan barcode"}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-faint">
                Paste a product link, enter a stockcode, or scan a barcode to look up nutrition automatically.
              </p>
            </div>
            )}

          <div className="flex items-start gap-4">
            <Popover>
              <PopoverTrigger
                aria-label="Edit photo"
                className={cn(
                  "relative size-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-opacity hover:opacity-90",
                  imageUrl ? "bg-muted" : "border-2 border-dashed border-border/70 bg-transparent",
                )}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl || "/placeholder.svg"} alt="Food preview" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-faint">
                    <Plus className="size-6" />
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
                      photoMode === "upload"
                        ? "bg-muted text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode("url")}
                    className={cn(
                      "h-9 rounded-lg text-sm font-semibold transition-colors",
                      photoMode === "url"
                        ? "bg-muted text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Image URL
                  </button>
                </div>
                <div className="mt-2.5">
                  {photoMode === "upload" ? (
                    <>
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
                        className="h-11 w-full rounded-xl border-border/70 font-semibold"
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
                    </>
                  ) : (
                    <Input
                      type="url"
                      placeholder="https://example.com/food.jpg"
                      value={imageUrl ?? ""}
                      onChange={(e) => setImageUrl(e.target.value || null)}
                      className={fieldInput}
                    />
                  )}
                </div>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="size-4" />
                    Remove image
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <div className="grid flex-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="food-name" className={labelClass}>
                  Name
                </label>
                <Input
                  id="food-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Greek yogurt"
                  className={fieldInput}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="food-brand" className={labelClass}>
                  Brand <span className="font-normal text-faint">(optional)</span>
                </label>
                <Input
                  id="food-brand"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="e.g. Chobani"
                  className={fieldInput}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="food-servings-pack" className={labelClass}>
                  Servings / pack <span className="font-normal text-faint">(optional)</span>
                </label>
                <Input
                  id="food-servings-pack"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.servingsPack}
                  onChange={(e) => set("servingsPack", e.target.value)}
                  placeholder="e.g. 4"
                  className={fieldInput}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="food-serving" className={labelClass}>
                  Serving size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="food-serving"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.servingSize}
                    onChange={(e) => set("servingSize", e.target.value)}
                    placeholder="e.g. 100"
                    className={cn(fieldInput, "flex-1")}
                  />
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
                    {(["g", "ml"] as ServingUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setServingUnit(u)}
                        aria-pressed={servingUnit === u}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                          servingUnit === u
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="food-pack-size" className={labelClass}>
                  Pack size <span className="font-normal text-faint">(optional)</span>
                </label>
                <Input
                  id="food-pack-size"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.packSize}
                  onChange={(e) => set("packSize", e.target.value)}
                  placeholder={`e.g. 500 (total ${servingUnit} of product)`}
                  className={fieldInput}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="food-url" className={labelClass}>
                Reference link <span className="font-normal text-faint">(optional)</span>
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input
                  id="food-url"
                  type="url"
                  className={cn(fieldInput, "pl-10")}
                  value={form.infoUrl}
                  onChange={(e) => set("infoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                Nutrition information
              </h3>
              <div className={cn(gridCols, "pb-1")}>
                <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint">Nutrient</span>
                <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  Per serving
                </span>
                <span className="text-right text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  Per 100{servingUnit}
                </span>
              </div>

              {renderNutrientRow("Energy (kJ)", "calories", "caloriesPerHundred")}

              {/* Calories (read-only, auto-calculated from kJ) */}
              <div className={cn(gridCols, "items-center border-t border-border/40 py-2.5")}>
                <span className="text-sm text-faint">Calories (kcal)</span>
                <div className="flex h-10 items-center justify-end px-3 text-sm text-faint">
                  {form.calories ? round(Number(form.calories) / KJ_PER_KCAL, 1) : "—"}
                </div>
                <div className="flex h-10 items-center justify-end px-3 text-sm text-faint">
                  {form.caloriesPerHundred ? round(Number(form.caloriesPerHundred) / KJ_PER_KCAL, 1) : "—"}
                </div>
              </div>

              {renderNutrientRow("Protein (g)", "protein", "proteinPerHundred")}
              {renderNutrientRow("Fat (g)", "fat", "fatPerHundred")}
              {renderNutrientRow("— Saturated (g)", "saturatedFat", "saturatedFatPerHundred", true)}
              {renderNutrientRow("Carbs (g)", "carbs", "carbsPerHundred")}
              {renderNutrientRow("— Sugars (g)", "sugars", "sugarsPerHundred", true)}
              {renderNutrientRow("Dietary fibre (g)", "dietaryFiber", "dietaryFiberPerHundred")}
              {renderNutrientRow("Sodium (mg)", "sodium", "sodiumPerHundred")}
            </div>


            {/* Food score */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-inset p-4 sm:p-5">
              <div>
                <p className="text-sm font-bold text-foreground">Food score</p>
                <p className="text-xs text-faint">Protein score per 100 kcal · calorie density per 100g</p>
              </div>
              <div className="flex items-center gap-1.5">
                <ProteinScoreBadges
                  proteinG={Number(form.protein) || 0}
                  kcal={form.calories ? Number(form.calories) / KJ_PER_KCAL : 0}
                />
                <CalorieDensityBadge
                  kcal={form.caloriesPerHundred ? Number(form.caloriesPerHundred) / KJ_PER_KCAL : 0}
                  servingSize="100"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-2 border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full px-6 font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-full px-7 font-semibold"
              disabled={pending || uploading}
            >
              {pending ? "Saving..." : food ? "Save changes" : "Save food"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleBarcodeDetected} />
    </>
  )
}
