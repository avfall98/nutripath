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

type ImportResult = {
  name: string
  brand: string
  imageUrl: string | null
  infoUrl: string
  servingSize: string
  servingUnit: "g" | "ml"
  // Energy is stored in kJ, sodium in mg, everything else in grams to match the app.
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
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/\/productdetails\/(\d+)/i)
  if (match) return match[1]
  const loose = trimmed.match(/(\d{4,})/)
  return loose ? loose[1] : null
}

/** Parse a value like "1,100.0kJ", "23.6g" or "240.0mg" into a float. */
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

/** A simple cookie jar that captures Set-Cookie headers across requests. */
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

const NUTRIENT_MATCHERS: { key: string; test: (name: string) => boolean }[] = [
  { key: "energy", test: (n) => n.includes("energy") && n.includes("kj") },
  { key: "protein", test: (n) => n.includes("protein") },
  { key: "satfat", test: (n) => n.includes("fatsaturated") },
  { key: "fat", test: (n) => n.includes("fattotal") },
  { key: "carbs", test: (n) => n.includes("carbohydrate") },
  { key: "sugars", test: (n) => n.includes("sugars") },
  { key: "fiber", test: (n) => n.includes("dietaryfibre") || n.includes("dietaryfiber") },
  { key: "sodium", test: (n) => n.includes("sodium") },
]

/**
 * Woolworths stores nutrition as a JSON string in
 * AdditionalAttributes.nutritionalinformation with an `Attributes` array whose
 * entries look like:
 *   { Name: "Energy kJ Quantity Per Serve - Total - NIP", Value: "1100.0kJ" }
 */
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
    // Skip descriptive "ValueWord" duplicates.
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
  // Matcher only accepts "kj" energy rows, but guard for kcal just in case.
  if (unit.includes("cal") && !unit.includes("kj")) return round(entry.value * KJ_PER_KCAL, 0)
  return round(entry.value, 0)
}

function val(entry: { value: number | null } | undefined): number | null {
  return entry?.value ?? null
}

/** Derive the numeric serving size from the ratio of per-serve to per-100 energy. */
function deriveServingSize(perServe: number | null, per100: number | null): number | null {
  if (perServe == null || per100 == null || per100 === 0) return null
  const size = (perServe / per100) * 100
  if (!Number.isFinite(size) || size <= 0) return null
  return round(size, 0)
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

    const jar = new CookieJar()

    // Step 1: prime Akamai bot-protection cookies via a homepage GET.
    try {
      const home = await fetchWithTimeout(
        "https://www.woolworths.com.au/",
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
      // Drain the body so the connection is released.
      await home.text().catch(() => {})
    } catch (e) {
      console.log("[v0] Woolworths cookie prime failed:", e)
    }

    // Step 2: call the product detail API with the primed session cookies.
    const apiUrl = `https://www.woolworths.com.au/apis/ui/product/detail/${stockcode}`
    const res = await fetchWithTimeout(
      apiUrl,
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
      console.log("[v0] Woolworths fetch failed:", res.status, res.statusText)
      if (res.status === 403) {
        return NextResponse.json(
          {
            error:
              "Woolworths blocked the request (403). This usually means their bot protection rejected the server's IP. Try again shortly, or enter the details manually.",
          },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { error: `Woolworths returned ${res.status}. Please try again in a moment.` },
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

    const aa = product.AdditionalAttributes ?? {}
    const { perServe, per100 } = parseNutritionalInformation(
      aa.nutritionalinformation ?? aa.NutritionalInformation ?? null,
    )

    const caloriesKj = toKj(perServe.energy)
    const caloriesKjPer100 = toKj(per100.energy)

    // Serving size: explicit attribute if present, else derived from energy ratio.
    const explicitServing = parseNumber(aa["servingsize-total-nip"] ?? aa.servingsize ?? null)
    const derivedServing = deriveServingSize(caloriesKj, caloriesKjPer100)
    const servingNum = explicitServing ?? derivedServing

    // Serving unit: infer from PackageSize / Unit (mL / L => ml, else g).
    const packageSize = String(product.PackageSize ?? product.Unit ?? "").toLowerCase()
    const isLiquid = packageSize.includes("ml") || packageSize.includes("litre") || /\d\s*l\b/.test(packageSize)
    const servingUnit: "g" | "ml" = isLiquid ? "ml" : "g"

    const result: ImportResult = {
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

    if (!result.name) {
      return NextResponse.json({ error: "Product found but it has no name." }, { status: 422 })
    }

    return NextResponse.json({ product: result })
  } catch (error) {
    console.log("[v0] Woolworths import error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Woolworths product. Please check the URL and try again." },
      { status: 500 },
    )
  }
}
