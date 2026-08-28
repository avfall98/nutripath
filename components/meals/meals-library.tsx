"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteMeal, duplicateMeal, toggleMealFavourite } from "@/app/actions/meals"
import type { MealDTO, ProfileDTO } from "@/lib/types"
import { mealTotals } from "@/lib/meals"
import { proteinPer100Cal, calorieDensity } from "@/lib/nutrition"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowUpDown, Bookmark, Copy, MoreVertical, Pencil, Plus, Search, Soup, Trash2 } from "lucide-react"

type SortKey = "name-asc" | "name-desc" | "kcal-desc" | "protein-desc" | "kcal-score-desc" | "protein-score-desc"
type FilterKey = "all" | "favourites" | "high-protein" | "low-calorie" | "ab-scores"

const ROW_GRID = "grid grid-cols-[44px_1fr_120px_112px_60px_60px_80px_80px_28px] items-center gap-x-3"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favourites", label: "Favs" },
  { key: "high-protein", label: "High protein" },
  { key: "low-calorie", label: "Low calorie" },
  { key: "ab-scores", label: "A & B scores" },
]

type MealWithTotals = MealDTO & { totals: ReturnType<typeof mealTotals> }

export function MealsLibrary({ meals, profile }: { meals: MealDTO[]; profile: ProfileDTO | null }) {
  const router = useRouter()
  const [items, setItems] = useState<MealDTO[]>(meals)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name-asc")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [, startTransition] = useTransition()

  const withTotals: MealWithTotals[] = useMemo(
    () => items.map((m) => ({ ...m, totals: mealTotals(m.ingredients) })),
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = withTotals
    if (q) result = result.filter((m) => m.name.toLowerCase().includes(q))
    if (filter !== "all") {
      result = result.filter((m) => {
        if (filter === "favourites") return m.favourite
        const pGrade = proteinPer100Cal(m.totals.protein, m.totals.kcal).grade
        const dGrade = calorieDensity(m.totals.kcal, m.totals.weightG || null).grade
        const proteinOk = pGrade === "A" || pGrade === "B"
        const calorieOk = dGrade === "A" || dGrade === "B"
        if (filter === "high-protein") return proteinOk
        if (filter === "low-calorie") return calorieOk
        if (filter === "ab-scores") return proteinOk && calorieOk
        return true
      })
    }
    return [...result].sort((a, b) => {
      switch (sortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "kcal-desc":
          return b.totals.kcal - a.totals.kcal
        case "protein-desc":
          return b.totals.protein - a.totals.protein
        case "kcal-score-desc": {
          const av = calorieDensity(a.totals.kcal, a.totals.weightG || null).value
          const bv = calorieDensity(b.totals.kcal, b.totals.weightG || null).value
          if (av == null) return bv == null ? 0 : 1
          if (bv == null) return -1
          return av - bv
        }
        case "protein-score-desc": {
          const av = proteinPer100Cal(a.totals.protein, a.totals.kcal).value ?? -1
          const bv = proteinPer100Cal(b.totals.protein, b.totals.kcal).value ?? -1
          return bv - av
        }
        default:
          return 0
      }
    })
  }, [withTotals, query, sortKey, filter])

  function openNew() {
    router.push("/meals/new")
  }

  function openEdit(meal: MealDTO) {
    router.push(`/meals/${meal.id}`)
  }

  function handleDelete(meal: MealDTO) {
    if (!confirm(`Delete "${meal.name}"? This won't affect meals already logged.`)) return
    setItems((prev) => prev.filter((m) => m.id !== meal.id))
    startTransition(async () => {
      try {
        await deleteMeal(meal.id)
        toast.success("Meal deleted.")
      } catch {
        setItems((prev) => [meal, ...prev])
        toast.error("Could not delete meal.")
      }
    })
  }

  function handleToggleFavourite(meal: MealDTO) {
    const next = !meal.favourite
    setItems((prev) => prev.map((m) => (m.id === meal.id ? { ...m, favourite: next } : m)))
    startTransition(async () => {
      try {
        await toggleMealFavourite(meal.id, next)
        toast.success(next ? `Added "${meal.name}" to favourites.` : `Removed "${meal.name}" from favourites.`)
      } catch {
        setItems((prev) => prev.map((m) => (m.id === meal.id ? { ...m, favourite: !next } : m)))
        toast.error("Could not update favourite.")
      }
    })
  }

  function handleDuplicate(meal: MealDTO) {
    startTransition(async () => {
      try {
        const copy = await duplicateMeal(meal.id)
        setItems((prev) => [copy, ...prev])
        toast.success(`Duplicated "${meal.name}".`)
      } catch {
        toast.error("Could not duplicate meal.")
      }
    })
  }

  function mealMenu(meal: MealDTO) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon" variant="ghost" className="size-7 rounded-md text-muted-foreground" aria-label="Meal options" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openEdit(meal)}>
              <Pencil data-icon="inline-start" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(meal)}>
              <Copy data-icon="inline-start" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleFavourite(meal)}>
              <Bookmark data-icon="inline-start" className={meal.favourite ? "fill-current text-primary" : ""} />
              {meal.favourite ? "Remove favourite" : "Favourite"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(meal)}>
              <Trash2 data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const sortMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground transition-colors hover:text-white"
          />
        }
      >
        <ArrowUpDown className="size-3.5" />
        Sort · {filtered.length} {filtered.length === 1 ? "meal" : "meals"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setSortKey("name-asc")} className={sortKey === "name-asc" ? "bg-accent" : ""}>
            Name (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortKey("name-desc")} className={sortKey === "name-desc" ? "bg-accent" : ""}>
            Name (Z-A)
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setSortKey("kcal-desc")} className={sortKey === "kcal-desc" ? "bg-accent" : ""}>
            Highest kcal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortKey("protein-desc")} className={sortKey === "protein-desc" ? "bg-accent" : ""}>
            Most protein
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortKey("protein-score-desc")}
            className={sortKey === "protein-score-desc" ? "bg-accent" : ""}
          >
            Protein score
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortKey("kcal-score-desc")}
            className={sortKey === "kcal-score-desc" ? "bg-accent" : ""}
          >
            Kcal score
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  function thumb(meal: MealDTO, size: "sm" | "md" = "sm") {
    const cls = size === "md" ? "size-12" : "size-11"
    return (
      <span className={cn(cls, "shrink-0 overflow-hidden rounded-[4px] bg-track")}>
        {meal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meal.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-faint">
            <Soup className="size-4" />
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Title + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance md:text-3xl">Meals</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            Combinations of library foods you eat as one thing. Nutrition is calculated from the ingredients.
          </p>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">
            {items.length} saved combination{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] md:flex"
        >
          <Plus className="size-4" />
          New meal
        </button>
        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] md:hidden"
        >
          <Plus className="size-4" />
          New
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-12 w-full rounded-full bg-inset pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-inset-hover focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder="Search your meals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Filter chips + sort */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                  active ? "bg-white text-black" : "bg-[#232323] text-white hover:bg-[#2a2a2a]",
                )}
              >
                {f.label}
              </button>
            )
          })}
          <div className="ml-auto hidden md:block">{sortMenu}</div>
        </div>
      )}

      {items.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Soup />
            </EmptyMedia>
            <EmptyTitle>No meals yet</EmptyTitle>
            <EmptyDescription>
              Build combinations of your library foods so you can log a whole meal in one tap.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openNew}>
              <Plus data-icon="inline-start" />
              Create your first meal
            </Button>
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No meals match your filters.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden flex-col md:flex">
            <div
              className={cn(
                ROW_GRID,
                "border-b border-white/10 px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-faint",
              )}
            >
              <span />
              <span>Meal</span>
              <span>Kcal</span>
              <span>Protein</span>
              <span>Carbs</span>
              <span>Fat</span>
              <span className="text-right">Kcal score</span>
              <span className="text-right">P score</span>
              <span />
            </div>
            <ul className="mt-1 flex flex-col">
              {filtered.map((meal) => {
                const t = meal.totals
                const caloriesPct = profile?.targetCalories ? Math.round((t.kcal / profile.targetCalories) * 100) : 0
                const proteinPct = profile?.targetProtein ? Math.round((t.protein / profile.targetProtein) * 100) : 0
                return (
                  <li key={meal.id} className={cn(ROW_GRID, "group rounded-[4px] px-2 py-2.5 hover:bg-white/[0.08]")}>
                    <button
                      type="button"
                      onClick={() => openEdit(meal)}
                      className="transition-opacity hover:opacity-80"
                      aria-label={`Edit ${meal.name}`}
                    >
                      {thumb(meal)}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {meal.favourite && (
                          <Bookmark className="size-3.5 shrink-0 fill-current text-primary" aria-label="Favourite" />
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(meal)}
                          className="block max-w-full truncate text-left text-[14px] font-semibold leading-tight hover:underline"
                        >
                          {meal.name}
                        </button>
                      </div>
                      <p className="truncate text-[11.5px] text-faint">
                        {t.count} ingredient{t.count === 1 ? "" : "s"} · {t.weightG}g
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="calories" />
                      {t.kcal}
                      {profile?.targetCalories ? <span className="font-normal text-faint">({caloriesPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="protein" />
                      {t.protein}
                      {profile?.targetProtein ? <span className="font-normal text-faint">({proteinPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="carbs" />
                      {t.carbs ?? "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="fat" />
                      {t.fat ?? "—"}
                    </span>
                    <div className="flex items-center justify-end">
                      <CalorieDensityBadge kcal={t.kcal} servingSize={t.weightG > 0 ? `${t.weightG}g` : null} />
                    </div>
                    <div className="flex items-center justify-end">
                      <ProteinScoreBadges proteinG={t.protein} kcal={t.kcal} />
                    </div>
                    <div className="flex items-center justify-end">{mealMenu(meal)}</div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((meal) => {
              const t = meal.totals
              const caloriesPct = profile?.targetCalories ? Math.round((t.kcal / profile.targetCalories) * 100) : 0
              const proteinPct = profile?.targetProtein ? Math.round((t.protein / profile.targetProtein) * 100) : 0
              return (
                <div key={meal.id} className="flex flex-col gap-3 rounded-[10px] bg-card p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(meal)}
                      className="transition-opacity hover:opacity-80"
                      aria-label={`Edit ${meal.name}`}
                    >
                      {thumb(meal, "md")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(meal)}
                      className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
                    >
                      <p className="flex items-center gap-1.5 text-[15px] font-bold leading-tight text-pretty">
                        {meal.favourite && <Bookmark className="size-4 shrink-0 fill-current text-primary" aria-label="Favourite" />}
                        {meal.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-faint">
                        {t.count} ingredient{t.count === 1 ? "" : "s"} · {t.weightG}g
                      </p>
                    </button>
                    <div className="-mr-1 -mt-1">{mealMenu(meal)}</div>
                  </div>
                  <MacroBadges
                    kcal={t.kcal}
                    kcalPct={profile?.targetCalories ? caloriesPct : null}
                    protein={t.protein}
                    proteinPct={profile?.targetProtein ? proteinPct : null}
                    carbs={t.carbs}
                    fat={t.fat}
                  />
                  <div className="flex items-center gap-1.5">
                    <CalorieDensityBadge kcal={t.kcal} servingSize={t.weightG > 0 ? `${t.weightG}g` : null} />
                    <ProteinScoreBadges proteinG={t.protein} kcal={t.kcal} />
                  </div>
                </div>
              )
            })}
            {/* Centered add circle */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={openNew}
                aria-label="New meal"
                className="flex size-10 items-center justify-center rounded-full border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
