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
