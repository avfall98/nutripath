"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteFood } from "@/app/actions/foods"
import type { FoodDTO, ProfileDTO } from "@/lib/types"
import { FoodFormDialog } from "@/components/foods/food-form-dialog"
import { ProteinScoreBadges } from "@/components/dashboard/protein-score-badges"
import { CalorieDensityBadge } from "@/components/dashboard/calorie-density-badge"
import { MacroBadges } from "@/components/dashboard/macro-badges"
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
import { toast } from "sonner"
import { Apple, ArrowUpDown, ExternalLink, MoreVertical, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react"

type SortKey = "name-asc" | "name-desc" | "kcal" | "protein" | "protein-score" | "kcal-score"

const KJ_PER_KCAL = 4.184

export function FoodLibrary({ foods, profile }: { foods: FoodDTO[]; profile: ProfileDTO | null }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodDTO | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("name-asc")
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = foods
    if (q) {
      result = foods.filter(
        (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q),
      )
    }
    const sorted = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "kcal":
          return b.calories / KJ_PER_KCAL - a.calories / KJ_PER_KCAL
        case "protein":
          return b.protein - a.protein
        case "protein-score": {
          const aScore = Math.max(0, Math.min(100, (a.protein / (Math.round(a.calories / KJ_PER_KCAL) * 0.1)) * 100))
          const bScore = Math.max(0, Math.min(100, (b.protein / (Math.round(b.calories / KJ_PER_KCAL) * 0.1)) * 100))
          return bScore - aScore
        }
        case "kcal-score": {
          const aScore = Math.round(a.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          const bScore = Math.round(b.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)
          return bScore - aScore
        }
        default:
          return 0
      }
    })
    return sorted
  }, [foods, query, sortKey, profile])

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-12 w-full rounded-full bg-inset pl-11 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            placeholder="Search your foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover,#6ee7a0)] max-sm:aspect-square max-sm:px-0"
          aria-label="Add food"
        >
          <Plus className="size-4" />
          <span className="max-sm:sr-only">Add food</span>
        </button>
      </div>

      {foods.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] text-faint">
            {filtered.length} of {foods.length} {foods.length === 1 ? "food" : "foods"}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                />
              }
            >
              <ArrowUpDown className="size-3.5" />
              Sort
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
        </div>
      )}

      {foods.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>No foods yet</EmptyTitle>
            <EmptyDescription>
              Build a library of foods you eat often so you can log them in one tap.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openNew}>
              <Plus data-icon="inline-start" />
              Add your first food
            </Button>
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No foods match &quot;{query}&quot;.</p>
      ) : (
        <Card>
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
                      className="size-12 shrink-0 overflow-hidden rounded-lg bg-track transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Edit ${food.name}`}
                    >
                      {food.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.imageUrl || "/placeholder.svg"} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-faint">
                          <Apple className="size-5" />
                        </span>
                      )}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 leading-tight text-pretty">
                          <button
                            type="button"
                            onClick={() => openEdit(food)}
                            className="text-left text-[13.5px] font-semibold hover:underline focus-visible:outline-none"
                          >
                            {food.name}
                          </button>
                          {(food.brand || food.servingSize) && (
                            <span className="ml-2 text-[11.5px] font-normal text-faint">
                              {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {food.infoUrl && (
                            <a
                              href={food.infoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hidden items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
                            >
                              More info
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button size="icon" variant="ghost" className="-mt-1 size-7 text-muted-foreground" aria-label="Food options" />
                              }
                            >
                              <MoreVertical />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => openEdit(food)}>
                                  <Pencil data-icon="inline-start" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(food)}>
                                  <Trash2 data-icon="inline-start" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MacroBadges
                          variant="columns"
                          kcal={caloriesKcal}
                          kcalPct={profile?.targetCalories ? caloriesPct : null}
                          protein={food.protein}
                          proteinPct={profile?.targetProtein ? proteinPct : null}
                          carbs={food.carbs}
                          fat={food.fat}
                        />
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
      )}

      <FoodFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        food={editing}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
