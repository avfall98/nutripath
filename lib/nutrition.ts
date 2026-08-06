export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little exercise)", factor: 1.2 },
  { value: "light", label: "Light (1-3 days/week)", factor: 1.375 },
  { value: "moderate", label: "Moderate (3-5 days/week)", factor: 1.55 },
  { value: "active", label: "Active (6-7 days/week)", factor: 1.725 },
  { value: "very_active", label: "Very active (physical job)", factor: 1.9 },
] as const

export const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const

export type ProteinGrade = "A" | "B" | "C" | "D" | "F"

export type ProteinScore = {
  grade: ProteinGrade | null
  color: string
  value: number | null
}

const GRADE_COLORS: Record<ProteinGrade, string> = {
  A: "#10B981",
  B: "#84CC16",
  C: "#F59E0B",
  D: "#F97316",
  F: "#EF4444",
}

const NA_COLOR = "#94A3B8"

// Method 1: Protein per 100 Calories -> (protein / kcal) * 100
export function proteinPer100Cal(proteinG: number, kcal: number): ProteinScore {
  if (!Number.isFinite(kcal) || kcal <= 0 || !Number.isFinite(proteinG)) {
    return { grade: null, color: NA_COLOR, value: null }
  }
  const value = (proteinG / kcal) * 100
  let grade: ProteinGrade
  if (value >= 10) grade = "A"
  else if (value >= 8) grade = "B"
  else if (value >= 6) grade = "C"
  else if (value >= 4) grade = "D"
  else grade = "F"
  return { grade, color: GRADE_COLORS[grade], value }
}

// Method 2: Protein Calorie Percentage -> ((protein * 4) / kcal) * 100
export function proteinCaloriePct(proteinG: number, kcal: number): ProteinScore {
  if (!Number.isFinite(kcal) || kcal <= 0 || !Number.isFinite(proteinG)) {
    return { grade: null, color: NA_COLOR, value: null }
  }
  const value = ((proteinG * 4) / kcal) * 100
  let grade: ProteinGrade
  if (value >= 40) grade = "A"
  else if (value >= 32) grade = "B"
  else if (value >= 24) grade = "C"
  else if (value >= 16) grade = "D"
  else grade = "F"
  return { grade, color: GRADE_COLORS[grade], value }
}

export type CalorieDensityGrade = "A" | "B" | "C" | "D" | "F"

export type CalorieDensity = {
  grade: CalorieDensityGrade | null
  color: string
  value: number | null
  label: string
}

const DENSITY_COLORS: Record<CalorieDensityGrade, string> = {
  A: "#10B981",
  B: "#84CC16",
  C: "#F59E0B",
  D: "#F97316",
  F: "#EF4444",
}

const DENSITY_LABELS: Record<CalorieDensityGrade, string> = {
  A: "Low Density",
  B: "Moderate Density",
  C: "Medium Density",
  D: "High Density",
  F: "Very High Density",
}

// Parse the unit ("ml" or "g") from a serving size string like "100g" or "250 ml".
export function parseServingUnit(servingSize: string | null | undefined): "g" | "ml" | null {
  if (!servingSize) return null
  return /ml/i.test(servingSize) ? "ml" : "g"
}

// Parse a serving size string like "100g" or "250 ml" into grams/millilitres.
export function parseServingWeight(servingSize: string | null | undefined): number | null {
  if (!servingSize) return null
  const match = servingSize.match(/([\d.]+)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

// Calorie density: (kcal / serving weight in grams) * 100 -> kcal per 100g/100ml.
export function calorieDensity(kcal: number, servingWeightG: number | null): CalorieDensity {
  if (
    servingWeightG == null ||
    !Number.isFinite(servingWeightG) ||
    servingWeightG <= 0 ||
    !Number.isFinite(kcal)
  ) {
    return { grade: null, color: NA_COLOR, value: null, label: "N/A" }
  }
  const value = (kcal / servingWeightG) * 100
  let grade: CalorieDensityGrade
  if (value < 70) grade = "A"
  else if (value <= 150) grade = "B"
  else if (value <= 250) grade = "C"
  else if (value <= 400) grade = "D"
  else grade = "F"
  return { grade, color: DENSITY_COLORS[grade], value, label: DENSITY_LABELS[grade] }
}

// Mifflin-St Jeor basal metabolic rate.
export function bmr(sex: string, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "female" ? base - 161 : base + 5
}

export function activityFactor(level: string | null): number {
  return ACTIVITY_LEVELS.find((l) => l.value === level)?.factor ?? 1.2
}

// Suggest daily targets. If the user wants to lose weight, apply a modest deficit.
export function suggestTargets(input: {
  sex: string
  weightKg: number
  heightCm: number
  age: number
  activityLevel: string | null
  targetWeightKg: number | null
}): { calories: number; protein: number } {
  const tdee = bmr(input.sex, input.weightKg, input.heightCm, input.age) * activityFactor(input.activityLevel)

  let calories = tdee
  if (input.targetWeightKg != null) {
    if (input.targetWeightKg < input.weightKg) calories = tdee - 500 // ~0.5kg/week loss
    else if (input.targetWeightKg > input.weightKg) calories = tdee + 300 // lean gain
  }

  // Protein target: ~1.8g per kg of target (or current) body weight.
  const refWeight = input.targetWeightKg ?? input.weightKg
  const protein = refWeight * 1.8

  return { calories: Math.round(calories / 10) * 10, protein: Math.round(protein) }
}
