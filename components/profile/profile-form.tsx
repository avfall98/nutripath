"use client"

import { useState, useTransition } from "react"
import { saveProfile } from "@/app/actions/profile"
import type { ProfileDTO } from "@/lib/types"
import { ACTIVITY_LEVELS, SEXES, suggestTargets } from "@/lib/nutrition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

type FormState = {
  age: string
  sex: string
  heightCm: string
  weightKg: string
  targetWeightKg: string
  targetCalories: string
  targetProtein: string
  activityLevel: string
}

function toStr(v: number | null): string {
  return v === null || v === undefined ? "" : String(v)
}

function toNum(v: string): number | null {
  if (v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ProfileForm({ profile }: { profile: ProfileDTO | null }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({
    age: toStr(profile?.age ?? null),
    sex: profile?.sex ?? "",
    heightCm: toStr(profile?.heightCm ?? null),
    weightKg: toStr(profile?.weightKg ?? null),
    targetWeightKg: toStr(profile?.targetWeightKg ?? null),
    targetCalories: toStr(profile?.targetCalories ?? null),
    targetProtein: toStr(profile?.targetProtein ?? null),
    activityLevel: profile?.activityLevel ?? "",
  })

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSuggest() {
    const sex = form.sex
    const weightKg = toNum(form.weightKg)
    const heightCm = toNum(form.heightCm)
    const age = toNum(form.age)
    if (!sex || !weightKg || !heightCm || !age) {
      toast.error("Enter sex, age, height, and weight first to get a suggestion.")
      return
    }
    const { calories, protein } = suggestTargets({
      sex,
      weightKg,
      heightCm,
      age,
      activityLevel: form.activityLevel || null,
      targetWeightKg: toNum(form.targetWeightKg),
    })
    setForm((f) => ({ ...f, targetCalories: String(calories), targetProtein: String(protein) }))
    toast.success(`Suggested ${calories} kcal and ${protein}g protein per day.`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await saveProfile({
        age: toNum(form.age),
        sex: form.sex || null,
        heightCm: toNum(form.heightCm),
        weightKg: toNum(form.weightKg),
        targetWeightKg: toNum(form.targetWeightKg),
        targetCalories: toNum(form.targetCalories),
        targetProtein: toNum(form.targetProtein),
        activityLevel: form.activityLevel || null,
      })
      toast.success("Profile saved.")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>Used to personalize your daily targets. Units are metric.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="age">Age</FieldLabel>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 30"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sex">Sex</FieldLabel>
                <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SEXES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="height">Height (cm)</FieldLabel>
                <Input
                  id="height"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.heightCm}
                  onChange={(e) => set("heightCm", e.target.value)}
                  placeholder="e.g. 175"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="weight">Current weight (kg)</FieldLabel>
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => set("weightKg", e.target.value)}
                  placeholder="e.g. 72.5"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="activity">Activity level</FieldLabel>
                <Select value={form.activityLevel} onValueChange={(v) => set("activityLevel", v)}>
                  <SelectTrigger id="activity">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ACTIVITY_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="targetWeight">Target weight (kg)</FieldLabel>
                <Input
                  id="targetWeight"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={form.targetWeightKg}
                  onChange={(e) => set("targetWeightKg", e.target.value)}
                  placeholder="e.g. 68"
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily targets</CardTitle>
          <CardDescription>
            Set your daily calorie and protein goals, or generate a suggestion from your details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend className="sr-only">Daily targets</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="calories">Target calories (kcal)</FieldLabel>
                  <Input
                    id="calories"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.targetCalories}
                    onChange={(e) => set("targetCalories", e.target.value)}
                    placeholder="e.g. 2000"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="protein">Target protein (g)</FieldLabel>
                  <Input
                    id="protein"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.targetProtein}
                    onChange={(e) => set("targetProtein", e.target.value)}
                    placeholder="e.g. 140"
                  />
                  <FieldDescription>Aim for enough protein to preserve muscle.</FieldDescription>
                </Field>
              </div>
              <Button type="button" variant="outline" onClick={handleSuggest} className="w-fit">
                <Sparkles data-icon="inline-start" />
                Suggest targets for me
              </Button>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  )
}
