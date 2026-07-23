import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const KJ_PER_KCAL = 4.184

type ImportResult = {
  name: string
  brand: string
  imageUrl: string | null
  infoUrl: string
  servingSize: string
  servingUnit: "g" | "ml"
  // Energy is stored in kJ to match how the app persists it.
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

/** Extract a numeric stockcode from a URL or a raw stockcode string. */
function extractStockcode(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Direct numeric stockcode
  if (/^\d+$/.test(trimmed)) return trimmed

  // Woolworths product detail URL: /productdetails/{stockcode}/...
  const match = trimmed.match(/\/productdetails\/(\d+)/i)
  if (match) return match[1]

  // Fallback: any run of 5+ digits in the string
  const loose = trimmed.match(/(\d{4,})/)
  return loose ? loose[1] : null
}

/** Parse a value like "1,234 kJ" or "12.5g" into a float. */
function parseNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const str = String(value).replace(/,/g, "")
  const match = str.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? n : null
}

function round(n: number, digits = 1): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

/** Normalise a nutrient name for matching. */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "")
}

type Nutrient = { perServing: number | null; per100: number | null; unit: string }

/**
 * Woolworths exposes nutrition in a few shapes. This normalises the common ones
 * into a map keyed by a normalised nutrient name.
 */
function parseNutrients(raw: unknown): {
  nutrients: Record<string, Nutrient>
  servingSize: string | null
} {
  const nutrients: Record<string, Nutrient> = {}
  let servingSize: string | null = null

  let data: any = raw
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw)
    } catch {
      data = null
    }
  }
  if (!data || typeof data !== "object") return { nutrients, servingSize }

  // Common serving size fields
  servingSize =
    data.servingSize ??
    data.ServingSize ??
    data.serving_size ??
    data.servingsize ??
    null

  // Find the array of nutrient rows under one of several possible keys.
  const candidateArrays: any[] = []
  const arrayKeys = ["nutrients", "Nutrients", "attributes", "Attributes", "rows", "Rows"]
  for (const key of arrayKeys) {
    if (Array.isArray(data[key])) candidateArrays.push(...data[key])
  }
  // Sometimes the whole payload is an array.
  if (Array.isArray(data)) candidateArrays.push(...data)

  for (const row of candidateArrays) {
    if (!row || typeof row !== "object") continue
    const name =
      row.Name ?? row.name ?? row.nutrient ?? row.Nutrient ?? row.label ?? row.Label
    if (!name) continue
    const key = normalizeName(String(name))
    const perServing = parseNumber(
      row.perServing ?? row.PerServing ?? row.perServe ?? row.value ?? row.Value ?? row.qty,
    )
    const per100 = parseNumber(
      row.per100g ?? row.Per100g ?? row.per100 ?? row.Per100 ?? row.per100ml ?? row.Per100ml,
    )
    const unit = String(row.unit ?? row.Unit ?? row.uom ?? "")
    nutrients[key] = { perServing, per100, unit }
  }

  return { nutrients, servingSize }
}

/** Pick the first nutrient matching any of the provided normalised keys. */
function pick(nutrients: Record<string, Nutrient>, keys: string[]): Nutrient | null {
  for (const k of keys) {
    if (nutrients[k]) return nutrients[k]
  }
  // Partial match fallback
  for (const k of keys) {
    const found = Object.keys(nutrients).find((n) => n.includes(k))
    if (found) return nutrients[found]
  }
  return null
}

/** Convert an energy nutrient to kJ regardless of whether it's kJ or kcal. */
function toKj(n: Nutrient | null, field: "perServing" | "per100"): number | null {
  if (!n) return null
  const val = n[field]
  if (val == null) return null
  const unit = n.unit.toLowerCase()
  if (unit.includes("cal") || unit === "kcal") return round(val * KJ_PER_KCAL, 0)
  return round(val, 0)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const query = String(body?.query ?? "")
    const stockcode = extractStockcode(query)

    if (!stockcode) {
      return NextResponse.json(
        { error: "Could not find a stockcode. Paste a Woolworths product URL or enter a stockcode." },
        { status: 400 },
      )
    }

    const apiUrl = `https://www.woolworths.com.au/apis/ui/product/detail/${stockcode}`
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-AU,en;q=0.9",
        Referer: "https://www.woolworths.com.au/",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      console.log("[v0] Woolworths fetch failed:", res.status, res.statusText)
      return NextResponse.json(
        { error: `Woolworths returned ${res.status}. The product may be unavailable.` },
        { status: 502 },
      )
    }

    const json = await res.json().catch(() => null)
    const product = json?.Product ?? json?.product ?? null

    if (!product) {
      return NextResponse.json({ error: "No product data found for that stockcode." }, { status: 404 })
    }

    const name: string = product.Name ?? product.DisplayName ?? product.name ?? ""
    const brand: string = product.Brand ?? product.brand ?? ""
    const image: string | null =
      product.LargeImageFile ?? product.MediumImageFile ?? product.SmallImageFile ?? null

    // Nutrition can live in a few spots.
    const rawNutrition =
      product.AdditionalAttributes?.nutritionalinformation ??
      product.AdditionalAttributes?.NutritionalInformation ??
      product.NutritionInformation ??
      product.NutritionalInformation ??
      null

    const { nutrients, servingSize: parsedServing } = parseNutrients(rawNutrition)

    const energy = pick(nutrients, ["energy"])
    const protein = pick(nutrients, ["protein"])
    const fat = pick(nutrients, ["fattotal", "totalfat", "fat"])
    const satFat = pick(nutrients, ["fatsaturated", "saturatedfat", "saturated"])
    const carbs = pick(nutrients, ["carbohydrate", "carbohydratetotal", "carbs", "carbstotal"])
    const sugars = pick(nutrients, ["sugars", "sugar"])
    const fiber = pick(nutrients, ["dietaryfibre", "dietaryfiber", "fibre", "fiber"])
    const sodium = pick(nutrients, ["sodium"])

    // Serving size: prefer parsed nutrition serving size, else product servingsize attribute.
    const servingRaw =
      parsedServing ??
      product.AdditionalAttributes?.servingsize ??
      product.AdditionalAttributes?.ServingSize ??
      null
    const servingNum = parseNumber(servingRaw)
    const servingUnit: "g" | "ml" =
      servingRaw && /ml/i.test(String(servingRaw)) ? "ml" : "g"

    const result: ImportResult = {
      name,
      brand,
      imageUrl: image,
      infoUrl: `https://www.woolworths.com.au/shop/productdetails/${stockcode}`,
      servingSize: servingNum != null ? String(servingNum) : "",
      servingUnit,
      caloriesKj: toKj(energy, "perServing"),
      protein: protein?.perServing ?? null,
      fat: fat?.perServing ?? null,
      saturatedFat: satFat?.perServing ?? null,
      carbs: carbs?.perServing ?? null,
      sugars: sugars?.perServing ?? null,
      dietaryFiber: fiber?.perServing ?? null,
      sodium: sodium?.perServing ?? null,
      caloriesKjPer100: toKj(energy, "per100"),
      proteinPer100: protein?.per100 ?? null,
      fatPer100: fat?.per100 ?? null,
      saturatedFatPer100: satFat?.per100 ?? null,
      carbsPer100: carbs?.per100 ?? null,
      sugarsPer100: sugars?.per100 ?? null,
      dietaryFiberPer100: fiber?.per100 ?? null,
      sodiumPer100: sodium?.per100 ?? null,
    }

    if (!result.name) {
      return NextResponse.json({ error: "Product found but it has no name." }, { status: 422 })
    }

    return NextResponse.json({ product: result })
  } catch (error) {
    console.log("[v0] Woolworths import error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Woolworths product. Please check the URL." },
      { status: 500 },
    )
  }
}
