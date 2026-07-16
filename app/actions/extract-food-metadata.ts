'use server'

export interface ExtractedFoodData {
  name?: string
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  servingSize?: string
}

export async function extractFoodMetadata(
  url: string
): Promise<ExtractedFoodData> {
  if (!url || !url.startsWith('http')) {
    return {}
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return {}
    }

    const html = await response.text()
    const extracted: ExtractedFoodData = {}

    // Extract Open Graph image
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (ogImageMatch?.[1]) {
      extracted.imageUrl = ogImageMatch[1]
    }

    // Extract Open Graph title as fallback
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    if (ogTitleMatch?.[1]) {
      extracted.name = ogTitleMatch[1]
    }

    // Extract page title if no OG title
    if (!extracted.name) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleMatch?.[1]) {
        extracted.name = titleMatch[1].split('|')[0].trim()
      }
    }

    // Extract structured data (Schema.org Product or NutritionInformation)
    const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i)
    if (schemaMatch?.[1]) {
      try {
        const schema = JSON.parse(schemaMatch[1])

        // Handle Product schema with nutrition
        if (schema['@type'] === 'Product') {
          if (schema.name && !extracted.name) {
            extracted.name = schema.name
          }
          if (schema.image && !extracted.imageUrl) {
            extracted.imageUrl = Array.isArray(schema.image)
              ? schema.image[0]
              : schema.image
          }

          // Try to find nutrition information in Product
          if (schema.nutrition) {
            const nutr = schema.nutrition
            if (nutr.calories) {
              extracted.calories = parseInt(String(nutr.calories))
            }
            if (nutr.proteinContent) {
              extracted.protein = parseFloat(String(nutr.proteinContent))
            }
            if (nutr.carbohydrateContent) {
              extracted.carbs = parseFloat(String(nutr.carbohydrateContent))
            }
            if (nutr.fatContent) {
              extracted.fat = parseFloat(String(nutr.fatContent))
            }
          }
        }

        // Handle NutritionInformation schema directly
        if (schema['@type'] === 'NutritionInformation') {
          if (schema.calories) {
            extracted.calories = parseInt(String(schema.calories))
          }
          if (schema.proteinContent) {
            extracted.protein = parseFloat(String(schema.proteinContent))
          }
          if (schema.carbohydrateContent) {
            extracted.carbs = parseFloat(String(schema.carbohydrateContent))
          }
          if (schema.fatContent) {
            extracted.fat = parseFloat(String(schema.fatContent))
          }
        }
      } catch {
        // Schema parsing failed, continue with other methods
      }
    }

    // Fallback: extract from meta tags for nutrition
    const caloriesMatch = html.match(/<meta[^>]*(?:name|property)=["'](?:calories|nutritional-calories)["'][^>]*content=["']([0-9.]+)["']/i)
    if (caloriesMatch?.[1] && !extracted.calories) {
      extracted.calories = parseInt(caloriesMatch[1])
    }

    const proteinMatch = html.match(/<meta[^>]*(?:name|property)=["'](?:protein|nutritional-protein)["'][^>]*content=["']([0-9.]+)["']/i)
    if (proteinMatch?.[1] && !extracted.protein) {
      extracted.protein = parseFloat(proteinMatch[1])
    }

    return extracted
  } catch (error) {
    console.error('[v0] Failed to extract food metadata:', error)
    return {}
  }
}
