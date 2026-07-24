"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { saveProfile } from "@/app/actions/profile"
import type { ProfileDTO } from "@/lib/types"
import { ACTIVITY_LEVELS, SEXES, suggestTargets } from "@/lib/nutrition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
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

const fieldInput =
  "h-12 w-full rounded-md border-0 bg-inset px-3.5 text-base shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
const selectTrigger =
  "h-12 w-full rounded-md border-0 bg-inset px-3.5 text-sm shadow-none data-placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40"
const labelClass = "text-sm font-semibold text-foreground"

function FieldBlock({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function ProfileForm({
  profile,
  children,
}: {
  profile: ProfileDTO | null
  children?: React.ReactNode
}) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="p-6 sm:p-7">
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-bold">Your details</CardTitle>
          <CardDescription>Used to personalize your daily targets. Units are metric.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <FieldBlock label="Age" htmlFor="age">
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="e.g. 30"
                className={fieldInput}
              />
            </FieldBlock>
            <FieldBlock label="Sex" htmlFor="sex">
              <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger id="sex" className={selectTrigger}>
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
            </FieldBlock>
            <FieldBlock label="Height (cm)" htmlFor="height">
              <Input
                id="height"
                type="number"
                inputMode="decimal"
                min={0}
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                placeholder="e.g. 175"
                className={fieldInput}
              />
            </FieldBlock>
            <FieldBlock label="Current weight (kg)" htmlFor="weight">
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                placeholder="e.g. 72.5"
                className={fieldInput}
              />
            </FieldBlock>
            <FieldBlock label="Activity level" htmlFor="activity">
              <Select value={form.activityLevel} onValueChange={(v) => set("activityLevel", v)}>
                <SelectTrigger id="activity" className={selectTrigger}>
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
            </FieldBlock>
            <FieldBlock label="Target weight (kg)" htmlFor="targetWeight">
              <Input
                id="targetWeight"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={form.targetWeightKg}
                onChange={(e) => set("targetWeightKg", e.target.value)}
                placeholder="e.g. 68"
                className={fieldInput}
              />
            </FieldBlock>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 sm:p-7">
        <CardHeader className="p-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Daily targets</CardTitle>
              <CardDescription>Set your daily calorie and protein goals.</CardDescription>
            </div>
            <button
              type="button"
              onClick={handleSuggest}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Sparkles className="size-3.5" />
              Suggest
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <FieldBlock label="Target calories (kcal)" htmlFor="calories">
              <Input
                id="calories"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.targetCalories}
                onChange={(e) => set("targetCalories", e.target.value)}
                placeholder="e.g. 2000"
                className={fieldInput}
              />
            </FieldBlock>
            <FieldBlock label="Target protein (g)" htmlFor="protein">
              <Input
                id="protein"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.targetProtein}
                onChange={(e) => set("targetProtein", e.target.value)}
                placeholder="e.g. 140"
                className={fieldInput}
              />
              <p className="text-xs text-faint">Aim for enough protein to preserve muscle.</p>
            </FieldBlock>
          </div>
        </CardContent>
      </Card>

      {children}

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          disabled={pending}
          className={cn("h-12 rounded-full px-7 text-sm font-bold", pending && "opacity-70")}
        >
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  )
}
