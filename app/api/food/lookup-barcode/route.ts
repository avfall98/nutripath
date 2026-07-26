import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30
// Woolworths (Akamai) geo/bot-blocks non-AU datacenter IPs with a 403.
// Pin this function to Vercel's Sydney region so the egress IP is Australian.
export const preferredRegion = "syd1"

const KJ_PER_KCAL = 4.184

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  "Accept-Language": "en-AU,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
}

/** Unified payload the Add/Edit Food form knows how to auto-fill. */
type LookupResult = {
  source: "woolworths" | "openfoodfacts"
  name: string
  brand: string
  imageUrl: string | null
  infoUrl: string
  servingSize: string
  servingUnit: "g" | "ml"
  // Energy stored in kJ, sodium in mg, everything else in grams to match the app.
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

class CookieJar {
  private jar = new Map<string, string>()
  store(res: Response) {
    const cookies = res.headers.getSetCookie?.() ?? []
    for (const c of cookies) {
      const [kv] = c.split(";")
      const i = kv.indexOf("=")
      if (i === -1) continue
      this.jar.set(kv.slice(0, i).trim(), kv.slice(i + 1))
    }
  }
  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
  }
}

/**
 * Route a Woolworths URL through an optional proxy service when
 * WOOLWORTHS_PROXY_URL is configured, so Akamai sees a trusted (ideally AU
 * residential) IP instead of Vercel's datacenter IP. Not applied to Open Food
 * Facts, which isn't blocked and shouldn't consume proxy credits.
 *
 * Template styles:
 *  - Contains "{url}" -> target URL (encoded) is substituted in place.
 *  - No "{url}"       -> target URL (encoded) is appended as ?url=...
 */
function proxied(targetUrl: string): string {
  const tpl = process.env.WOOLWORTHS_PROXY_URL
  if (!tpl) return targetUrl
  const encoded = encodeURIComponent(targetUrl)
  if (tpl.includes("{url}")) return tpl.replace("{url}", encoded)
  return `${tpl}${tpl.includes("?") ? "&" : "?"}url=${encoded}`
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

type Parsed = {
  perServe: Record<string, { value: number | null; unit: string }>
  per100: Record<string, { value: number | null; unit: string }>
}

// Order matters: scanned with `.find()`, so more specific matchers must come
// before generic ones they overlap with. Woolworths' sugars row is named
// "Carbohydrate Sugars ... NIP" (contains both "carbohydrate" and "sugars"),
// so `sugars` must be tested before `carbs`, and `satfat` before `fat`.
const NUTRIENT_MATCHERS: { key: string; test: (name: string) => boolean }[] = [
  { key: "energy", test: (n) => n.includes("energy") && n.includes("kj") },
  { key: "protein", test: (n) => n.includes("protein") },
  { key: "satfat", test: (n) => n.includes("fatsaturated") },
  { key: "fat", test: (n) => n.includes("fattotal") },
  { key: "sugars", test: (n) => n.includes("sugars") },
  { key: "carbs", test: (n) => n.includes("carbohydrate") },
  { key: "fiber", test: (n) => n.includes("dietaryfibre") || n.includes("dietaryfiber") },
  { key: "sodium", test: (n) => n.includes("sodium") },
]

function parseNutritionalInformation(raw: unknown): Parsed {
  const result: Parsed = { perServe: {}, per100: {} }
  let data: any = raw
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw)
    } catch {
      return result
    }
  }
  const attributes: any[] = Array.isArray(data?.Attributes)
    ? data.Attributes
    : Array.isArray(data)
      ? data
      : []

  for (const attr of attributes) {
    const rawName = String(attr?.Name ?? "")
    if (!rawName) continue
    const norm = rawName.toLowerCase()
    if (norm.includes("valueword")) continue

    const isPer100 = norm.includes("per 100")
    const isPerServe = norm.includes("per serve")
    if (!isPer100 && !isPerServe) continue

    const flat = norm.replace(/[^a-z]/g, "")
    const matcher = NUTRIENT_MATCHERS.find((m) => m.test(flat))
    if (!matcher) continue

    const value = parseNumber(attr?.Value)
    const unit = String(attr?.Value ?? "").replace(/[\d.,\s]/g, "")
    const target = isPer100 ? result.per100 : result.perServe
    if (!(matcher.key in target)) {
      target[matcher.key] = { value, unit }
    }
  }
  return result
}

function toKj(entry: { value: number | null; unit: string } | undefined): number | null {
  if (!entry || entry.value == null) return null
  const unit = entry.unit.toLowerCase()
  if (unit.includes("cal") && !unit.includes("kj")) return round(entry.value * KJ_PER_KCAL, 0)
  return round(entry.value, 0)
}

function val(entry: { value: number | null } | undefined): number | null {
  return entry?.value ?? null
}

function deriveServingSize(perServe: number | null, per100: number | null): number | null {
  if (perServe == null || per100 == null || per100 === 0) return null
  const size = (perServe / per100) * 100
  if (!Number.isFinite(size) || size <= 0) return null
  return round(size, 0)
}

/** Prime Akamai bot-protection cookies via a homepage GET. */
async function primeWoolworths(jar: CookieJar) {
  try {
    const home = await fetchWithTimeout(
      proxied("https://www.woolworths.com.au/"),
      {
        headers: {
          ...BASE_HEADERS,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
        },
        cache: "no-store",
      },
      15000,
    )
    jar.store(home)
    await home.text().catch(() => {})
  } catch (e) {
    console.log("[v0] Woolworths cookie prime failed:", e)
  }
}

/** Primary lookup: search Woolworths by barcode, then fetch product detail. */
async function lookupWoolworths(barcode: string): Promise<LookupResult | null> {
  const jar = new CookieJar()
  await primeWoolworths(jar)

  // Step 1: search for the barcode to resolve a stockcode.
  let stockcode: string | null = null
  try {
    const searchRes = await fetchWithTimeout(
      proxied("https://www.woolworths.com.au/apis/ui/Search/products"),
      {
        method: "POST",
        headers: {
          ...BASE_HEADERS,
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.woolworths.com.au/shop/search/products",
          "x-requested-with": "OnlineShopping.WebApp",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          Cookie: jar.header(),
        },
        body: JSON.stringify({ SearchTerm: barcode, PageSize: 1 }),
        cache: "no-store",
      },
      20000,
    )
    if (!searchRes.ok) {
      console.log("[v0] Woolworths search failed:", searchRes.status)
      return null
    }
    jar.store(searchRes)
    const searchJson = await searchRes.json().catch(() => null)
    const products: any[] = searchJson?.Products ?? []
    // Woolworths nests the actual product inside a Products array within each result.
    const first = products[0]
    const inner = first?.Products?.[0] ?? first
    stockcode = inner?.Stockcode != null ? String(inner.Stockcode) : null
  } catch (e) {
    console.log("[v0] Woolworths search error:", e)
    return null
  }

  if (!stockcode) return null

  // Step 2: fetch full product detail for the resolved stockcode.
  try {
    const apiUrl = `https://www.woolworths.com.au/apis/ui/product/detail/${stockcode}`
    const res = await fetchWithTimeout(
      proxied(apiUrl),
      {
        headers: {
          ...BASE_HEADERS,
          Accept: "application/json, text/plain, */*",
          Referer: `https://www.woolworths.com.au/shop/productdetails/${stockcode}`,
          "x-requested-with": "OnlineShopping.WebApp",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          Cookie: jar.header(),
        },
        cache: "no-store",
      },
      20000,
    )
    if (!res.ok) {
      console.log("[v0] Woolworths detail failed:", res.status)
      return null
    }
    const json = await res.json().catch(() => null)
    const product = json?.Product ?? json?.product ?? null
    if (!product) return null

    const name: string = product.Name ?? product.DisplayName ?? product.name ?? ""
    if (!name) return null
    const brand: string = product.Brand ?? product.brand ?? ""
    const image: string | null =
      product.LargeImageFile ?? product.MediumImageFile ?? product.SmallImageFile ?? null

    const aa = product.AdditionalAttributes ?? {}
    const { perServe, per100 } = parseNutritionalInformation(
      aa.nutritionalinformation ?? aa.NutritionalInformation ?? null,
    )

    const caloriesKj = toKj(perServe.energy)
    const caloriesKjPer100 = toKj(per100.energy)

    const explicitServing = parseNumber(aa["servingsize-total-nip"] ?? aa.servingsize ?? null)
    const derivedServing = deriveServingSize(caloriesKj, caloriesKjPer100)
    const servingNum = explicitServing ?? derivedServing

    const packageSize = String(product.PackageSize ?? product.Unit ?? "").toLowerCase()
    const isLiquid = packageSize.includes("ml") || packageSize.includes("litre") || /\d\s*l\b/.test(packageSize)
    const servingUnit: "g" | "ml" = isLiquid ? "ml" : "g"

    return {
      source: "woolworths",
      name,
      brand,
      imageUrl: image,
      infoUrl: `https://www.woolworths.com.au/shop/productdetails/${stockcode}`,
      servingSize: servingNum != null ? String(servingNum) : "",
      servingUnit,
      caloriesKj,
      protein: val(perServe.protein),
      fat: val(perServe.fat),
      saturatedFat: val(perServe.satfat),
      carbs: val(perServe.carbs),
      sugars: val(perServe.sugars),
      dietaryFiber: val(perServe.fiber),
      sodium: val(perServe.sodium),
      caloriesKjPer100,
      proteinPer100: val(per100.protein),
      fatPer100: val(per100.fat),
      saturatedFatPer100: val(per100.satfat),
      carbsPer100: val(per100.carbs),
      sugarsPer100: val(per100.sugars),
      dietaryFiberPer100: val(per100.fiber),
      sodiumPer100: val(per100.sodium),
    }
  } catch (e) {
    console.log("[v0] Woolworths detail error:", e)
    return null
  }
}

/** Multiply a per-100 value by the serving multiplier, if both are present. */
function perServing(per100: number | null, servingNum: number | null): number | null {
  if (per100 == null || servingNum == null || servingNum <= 0) return null
  return round(per100 * (servingNum / 100), 1)
}

/** Secondary fallback: Open Food Facts v2. */
async function lookupOpenFoodFacts(barcode: string): Promise<LookupResult | null> {
  try {
    const res = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        headers: {
          "User-Agent": "NutriPath/1.0 (nutrition tracker)",
          Accept: "application/json",
        },
        cache: "no-store",
      },
      20000,
    )
    if (!res.ok) {
      console.log("[v0] Open Food Facts failed:", res.status)
      return null
    }
    const json = await res.json().catch(() => null)
    if (!json || json.status !== 1 || !json.product) return null

    const product = json.product
    const name: string = product.product_name ?? product.generic_name ?? ""
    if (!name) return null
    const brand: string = product.brands ?? ""
    const image: string | null =
      product.image_front_url ?? product.image_url ?? product.image_front_small_url ?? null

    const n = product.nutriments ?? {}

    // Energy per 100g in kJ (convert from kcal if needed).
    let caloriesKjPer100: number | null = null
    if (n["energy-kj_100g"] != null) {
      caloriesKjPer100 = round(parseNumber(n["energy-kj_100g"]) ?? 0, 0)
    } else if (n["energy-kcal_100g"] != null) {
      const kcal = parseNumber(n["energy-kcal_100g"])
      caloriesKjPer100 = kcal != null ? round(kcal * KJ_PER_KCAL, 0) : null
    } else if (n.energy_100g != null) {
      // Legacy `energy_100g` is expressed in kJ.
      caloriesKjPer100 = round(parseNumber(n.energy_100g) ?? 0, 0)
    }

    const proteinPer100 = parseNumber(n["proteins_100g"])
    const fatPer100 = parseNumber(n["fat_100g"])
    const satFatPer100 = parseNumber(n["saturated-fat_100g"])
    const carbsPer100 = parseNumber(n["carbohydrates_100g"])
    const sugarsPer100 = parseNumber(n["sugars_100g"])
    const fiberPer100 = parseNumber(n["fiber_100g"])
    // OFF sodium is grams per 100g; the app stores sodium in mg.
    const sodiumGramsPer100 = parseNumber(n["sodium_100g"])
    const sodiumPer100 = sodiumGramsPer100 != null ? round(sodiumGramsPer100 * 1000, 0) : null

    // Serving size (grams / ml).
    const servingNum =
      parseNumber(product.serving_quantity) ?? parseNumber(product.serving_size) ?? null
    const servingSizeStr = String(product.serving_size ?? "").toLowerCase()
    const servingUnit: "g" | "ml" = servingSizeStr.includes("ml") ? "ml" : "g"

    return {
      source: "openfoodfacts",
      name,
      brand,
      imageUrl: image,
      infoUrl: `https://world.openfoodfacts.org/product/${barcode}`,
      servingSize: servingNum != null ? String(servingNum) : "",
      servingUnit,
      caloriesKj: perServing(caloriesKjPer100, servingNum) ,
      protein: perServing(proteinPer100, servingNum),
      fat: perServing(fatPer100, servingNum),
      saturatedFat: perServing(satFatPer100, servingNum),
      carbs: perServing(carbsPer100, servingNum),
      sugars: perServing(sugarsPer100, servingNum),
      dietaryFiber: perServing(fiberPer100, servingNum),
      sodium: perServing(sodiumPer100, servingNum),
      caloriesKjPer100,
      proteinPer100,
      fatPer100,
      saturatedFatPer100: satFatPer100,
      carbsPer100,
      sugarsPer100,
      dietaryFiberPer100: fiberPer100,
      sodiumPer100,
    }
  } catch (e) {
    console.log("[v0] Open Food Facts error:", e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const barcode = String(body?.barcode ?? "").trim()

    if (!barcode || !/^\d{6,14}$/.test(barcode)) {
      return NextResponse.json({ error: "A valid product barcode is required." }, { status: 400 })
    }

    // A. Primary lookup: Woolworths.
    let product = await lookupWoolworths(barcode)

    // B. Secondary fallback: Open Food Facts.
    if (!product) {
      product = await lookupOpenFoodFacts(barcode)
    }

    // C. Not found in either source.
    if (!product) {
      return NextResponse.json(
        { error: "Product barcode not found. Try entering URL or manual entry." },
        { status: 404 },
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.log("[v0] Barcode lookup error:", error)
    return NextResponse.json(
      { error: "Barcode lookup failed. Try entering URL or manual entry." },
      { status: 500 },
    )
  }
}
