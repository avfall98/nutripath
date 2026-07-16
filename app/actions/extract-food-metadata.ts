"use server"

import { generateText } from "ai"

export interface ExtractedFoodData {
  name?: string
  brand?: string
  imageUrl?: string
  calories?: number
  energyKj?: number
  protein?: number
  carbs?: number
  fat?: number
  servingSize?: string
}

const KJ_PER_KCAL = 4.184

// Try a direct fetch for the Open Graph image only. Many retail sites (e.g.
// Woolworths) block datacenter IPs, so this is best-effort and non-fatal.
async function scrapeOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return undefined
    const html = await res.text()
    const og = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    return og?.[1]
  } catch {
    return undefined
  }
}

function coerceNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : undefined
}

// Pull the first balanced JSON object out of a model response that may include
// prose, citations like [1], or ```json fences.
function parseJsonBlock(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function extractFoodMetadata(url: string): Promise<ExtractedFoodData> {
  if (!url || !url.startsWith("http")) return {}

  const prompt = `You are a nutrition data extractor. Visit and read this product web page: ${url}

Find the product's "Nutrition Information" panel and product details. Extract the nutrition values PER SERVING (not per 100g, unless only per-100g is available — in that case use per 100g and set servingSize to "100g").

Respond with ONLY a JSON object (no prose, no markdown fences, no citations) using exactly these keys. Use null for anything you cannot find:
{
  "name": string,            // product name, no site name suffix
  "brand": string,           // brand/manufacturer
  "servingSize": string,     // e.g. "60g bar" or "1 cup (170g)"
  "energyKj": number,        // energy in kilojoules per serving
  "calories": number,        // energy in Calories/kcal per serving
  "protein": number,         // grams per serving
  "carbs": number,           // total carbohydrate grams per serving
  "fat": number,             // total fat grams per serving
  "imageUrl": string         // direct URL to the product image
}
Return numbers as plain numbers (may include decimals), not strings.`

  try {
    const { text } = await generateText({
      model: "perplexity/sonar",
      prompt,
      temperature: 0,
    })

    const parsed = parseJsonBlock(text)
    if (!parsed) {
      console.log("[v0] Extraction: no JSON parsed from model output")
      return {}
    }

    const energyKj = coerceNumber(parsed.energyKj)
    let calories = coerceNumber(parsed.calories)
    if (calories == null && energyKj != null) {
      calories = Math.round((energyKj / KJ_PER_KCAL) * 10) / 10
    }

    const result: ExtractedFoodData = {
      name: typeof parsed.name === "string" ? parsed.name.trim() : undefined,
      brand: typeof parsed.brand === "string" ? parsed.brand.trim() : undefined,
      servingSize: typeof parsed.servingSize === "string" ? parsed.servingSize.trim() : undefined,
      energyKj,
      calories,
      protein: coerceNumber(parsed.protein),
      carbs: coerceNumber(parsed.carbs),
      fat: coerceNumber(parsed.fat),
      imageUrl: typeof parsed.imageUrl === "string" && parsed.imageUrl.startsWith("http") ? parsed.imageUrl : undefined,
    }

    // Prefer a real OG image scrape when the model didn't return a usable one.
    if (!result.imageUrl) {
      result.imageUrl = await scrapeOgImage(url)
    }

    return result
  } catch (error) {
    console.error("[v0] Failed to extract food metadata:", error)
    return {}
  }
}
