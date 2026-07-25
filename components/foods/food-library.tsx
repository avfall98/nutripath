"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteFood } from "@/app/actions/foods"
import type { FoodDTO, ProfileDTO } from "@/lib/types"
import { FoodFormDialog } from "@/components/foods/food-form-dialog"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges, MacroIcon } from "@/components/dashboard/macro-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { proteinPer100Cal, calorieDensity, parseServingWeight } from "@/lib/nutrition"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowUpDown, ExternalLink, MoreVertical, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react"

type SortKey = "name-asc" | "name-desc" | "kcal-asc" | "kcal-desc" | "protein-asc" | "protein-desc" | "carbs-asc" | "carbs-desc" | "fat-asc" | "fat-desc" | "protein-score-asc" | "protein-score-desc" | "kcal-score-asc" | "kcal-score-desc"
type FilterKey = "all" | "high-protein" | "low-calorie" | "ab-scores"

const KJ_PER_KCAL = 4.184

const ROW_GRID =
  "grid grid-cols-[20px_44px_1fr_120px_112px_60px_60px_80px_80px_32px] items-center gap-x-3"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high-protein", label: "High protein" },
  { key: "low-calorie", label: "Low calorie" },
  { key: "ab-scores", label: "A & B scores" },
]

export function FoodLibrary({ foods, profile }: { foods: FoodDTO[]; profile: ProfileDTO | null }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodDTO | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("name-asc")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = foods
    if (q) {
      result = foods.filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q))
    }
    if (filter !== "all") {
      result = result.filter((f) => {
        const kcal = Math.round(f.calories / KJ_PER_KCAL)
        const pGrade = proteinPer100Cal(f.protein, kcal).grade
        const dGrade = calorieDensity(kcal, parseServingWeight(f.servingSize)).grade
        const proteinOk = pGrade === "A" || pGrade === "B"
        const calorieOk = dGrade === "A" || dGrade === "B"
        if (filter === "high-protein") return proteinOk
        if (filter === "low-calorie") return calorieOk
        if (filter === "ab-scores") return proteinOk && calorieOk
        return true
      })
    }
    const sorted = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "kcal-asc":
          return a.calories / KJ_PER_KCAL - b.calories / KJ_PER_KCAL
        case "kcal-desc":
          return b.calories / KJ_PER_KCAL - a.calories / KJ_PER_KCAL
        case "protein-asc":
          return a.protein - b.protein
        case "protein-desc":
          return b.protein - a.protein
        case "carbs-asc":
          return (a.carbs ?? 0) - (b.carbs ?? 0)
        case "carbs-desc":
          return (b.carbs ?? 0) - (a.carbs ?? 0)
        case "fat-asc":
          return (a.fat ?? 0) - (b.fat ?? 0)
        case "fat-desc":
          return (b.fat ?? 0) - (a.fat ?? 0)
        case "protein-score-asc": {
          const aScore = Math.max(0, Math.min(100, (a.protein / (Math.round(a.calories / KJ_PER_KCAL) * 0.1)) * 100))
          const bScore = Math.max(0, Math.min(100, (b.protein / (Math.round(b.calories / KJ_PER_KCAL) * 0.1)) * 100))
          return aScore - bScore
        }
        case "protein-score-desc": {
          const aScore = Math.max(0, Math.min(100, (a.protein / (Math.round(a.calories / KJ_PER_KCAL) * 0.1)) * 100))
          const bScore = Math.max(0, Math.min(100, (b.protein / (Math.round(b.calories / KJ_PER_KCAL) * 0.1)) * 100))
          return bScore - aScore
        }
        case "kcal-score-asc": {
          const aScore = Math.round(a.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          const bScore = Math.round(b.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          return aScore - bScore
        }
        case "kcal-score-desc": {
          const aScore = Math.round(a.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          const bScore = Math.round(b.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          return bScore - aScore
        }
        default:
          return 0
      }
    })
    return sorted
  }, [foods, query, sortKey, filter, profile])

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(food: FoodDTO) {
    setEditing(food)
    setDialogOpen(true)
  }

  function handleDelete(food: FoodDTO) {
    if (!confirm(`Delete "${food.name}" from your library? This won't affect meals already logged.`)) return
    startTransition(async () => {
      await deleteFood(food.id)
      toast.success("Food deleted.")
      router.refresh()
    })
  }

  function foodMenu(food: FoodDTO) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon" variant="ghost" className="size-7 text-muted-foreground" aria-label="Food options" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openEdit(food)}>
              <Pencil data-icon="inline-start" />
              Edit
            </DropdownMenuItem>
            {food.infoUrl && (
              <DropdownMenuItem render={<a href={food.infoUrl} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink data-icon="inline-start" />
                More info
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(food)}>
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
        Sort · {filtered.length} {foods.length === 1 ? "food" : "foods"}
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
          <DropdownMenuItem onClick={() => setSortKey("kcal")} className={sortKey === "kcal" ? "bg-accent" : ""}>
            Highest kcal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortKey("protein")} className={sortKey === "protein" ? "bg-accent" : ""}>
            Most protein
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortKey("protein-score")} className={sortKey === "protein-score" ? "bg-accent" : ""}>
            Protein score
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortKey("kcal-score")} className={sortKey === "kcal-score" ? "bg-accent" : ""}>
            Kcal score
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Title + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.8px] text-balance md:text-3xl">Food library</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            Reusable foods with nutrition, photos, and links you can log any day.
          </p>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">Reusable foods with nutrition, photos, and links.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] md:flex"
        >
          <Plus className="size-4" />
          Add food
        </button>
      </div>

      {/* Search + mobile add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-12 w-full rounded-full bg-inset pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-inset-hover focus-visible:ring-2 focus-visible:ring-ring/50"
            placeholder="Search your foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-[1.03] md:hidden"
          aria-label="Add food"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {/* Filter chips + sort */}
      {foods.length > 0 && (
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
                  active
                    ? "bg-white text-black"
                    : "bg-[#232323] text-white hover:bg-[#2a2a2a]",
                )}
              >
                {f.label}
              </button>
            )
          })}
          <div className="ml-auto">{sortMenu}</div>
        </div>
      )}

      {foods.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>No foods yet</EmptyTitle>
            <EmptyDescription>Build a library of foods you eat often so you can log them in one tap.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openNew}>
              <Plus data-icon="inline-start" />
              Add your first food
            </Button>
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No foods match your filters.</p>
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
              <span className="text-right">#</span>
              <span />
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "name-desc") setSortKey("name-asc")
                  else setSortKey("name-desc")
                }}
                className="transition-colors hover:text-white"
              >
                FOOD
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "kcal-desc") setSortKey("kcal-asc")
                  else setSortKey("kcal-desc")
                }}
                className="transition-colors hover:text-white"
              >
                KCAL
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "protein-desc") setSortKey("protein-asc")
                  else setSortKey("protein-desc")
                }}
                className="transition-colors hover:text-white"
              >
                PROTEIN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "carbs-desc") setSortKey("carbs-asc")
                  else setSortKey("carbs-desc")
                }}
                className="transition-colors hover:text-white"
              >
                CARBS
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "fat-desc") setSortKey("fat-asc")
                  else setSortKey("fat-desc")
                }}
                className="transition-colors hover:text-white"
              >
                FAT
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "kcal-score-desc") setSortKey("kcal-score-asc")
                  else setSortKey("kcal-score-desc")
                }}
                className="text-right transition-colors hover:text-white"
              >
                KCAL SCORE
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "protein-score-desc") setSortKey("protein-score-asc")
                  else setSortKey("protein-score-desc")
                }}
                className="text-right transition-colors hover:text-white"
              >
                P SCORE
              </button>
              <span />
            </div>
            <ul className="mt-1 flex flex-col">
              {filtered.map((food, i) => {
                const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
                const caloriesPct = profile?.targetCalories ? Math.round((caloriesKcal / profile.targetCalories) * 100) : 0
                const proteinPct = profile?.targetProtein ? Math.round((food.protein / profile.targetProtein) * 100) : 0
                return (
                  <li key={food.id} className={cn(ROW_GRID, "group rounded-[4px] px-2 py-2.5 hover:bg-white/[0.08]")}>
                    <span className="text-right text-[13px] tabular-nums text-faint">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => openEdit(food)}
                      className="size-11 shrink-0 overflow-hidden rounded-[4px] bg-track transition-opacity hover:opacity-80"
                      aria-label={`Edit ${food.name}`}
                    >
                      {food.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-faint">
                          <UtensilsCrossed className="size-4" />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openEdit(food)}
                        className="block max-w-full truncate text-left text-[14px] font-semibold leading-tight hover:underline"
                      >
                        {food.name}
                      </button>
                      {(food.brand || food.servingSize) && (
                        <p className="truncate text-[11.5px] text-faint">
                          {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="calories" />
                      {caloriesKcal}
                      {profile?.targetCalories ? <span className="font-normal text-faint">({caloriesPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="protein" />
                      {Math.round(food.protein)}
                      {profile?.targetProtein ? <span className="font-normal text-faint">({proteinPct}%)</span> : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="carbs" />
                      {food.carbs != null ? Math.round(food.carbs) : "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
                      <MacroIcon macro="fat" />
                      {food.fat != null ? Math.round(food.fat) : "—"}
                    </span>
                    <div className="flex items-center justify-end">
                      <CalorieDensityBadge kcal={caloriesKcal} servingSize={food.servingSize} />
                    </div>
                    <div className="flex items-center justify-end">
                      <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal} />
                    </div>
                    <div className="flex justify-end">{foodMenu(food)}</div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Mobile stacked cards */}
          <Card className="md:hidden">
            <CardContent>
              <ul className="flex flex-col">
                {filtered.map((food) => {
                  const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
                  const caloriesPct = profile?.targetCalories ? Math.round((caloriesKcal / profile.targetCalories) * 100) : 0
                  const proteinPct = profile?.targetProtein ? Math.round((food.protein / profile.targetProtein) * 100) : 0
                  return (
                    <li key={food.id} className="flex gap-3 border-t border-border py-4 first:border-t-0 first:pt-0">
                      <button
                        type="button"
                        onClick={() => openEdit(food)}
                        className="size-12 shrink-0 overflow-hidden rounded-[4px] bg-track transition-opacity hover:opacity-80"
                        aria-label={`Edit ${food.name}`}
                      >
                        {food.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-faint">
                            <UtensilsCrossed className="size-5" />
                          </span>
                        )}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 leading-tight text-pretty">
                            <button
                              type="button"
                              onClick={() => openEdit(food)}
                              className="text-left text-[13.5px] font-semibold hover:underline"
                            >
                              {food.name}
                            </button>
                            {(food.brand || food.servingSize) && (
                              <span className="ml-2 text-[11.5px] font-normal text-faint">
                                {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </p>
                          <div className="-mt-1">{foodMenu(food)}</div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <MacroBadges
                            kcal={caloriesKcal}
                            kcalPct={profile?.targetCalories ? caloriesPct : null}
                            protein={food.protein}
                            proteinPct={profile?.targetProtein ? proteinPct : null}
                            carbs={food.carbs}
                            fat={food.fat}
                          />
                          <div className="flex shrink-0 items-center gap-1.5">
                            <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal} />
                            <CalorieDensityBadge kcal={caloriesKcal} servingSize={food.servingSize} />
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <FoodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} food={editing} onSaved={() => router.refresh()} />
    </div>
  )
}
