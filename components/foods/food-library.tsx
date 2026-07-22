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
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
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

    // Apply sorting
    const KJ_PER_KCAL = 4.184
    const sorted = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "kcal": {
          const aKcal = a.calories / KJ_PER_KCAL
          const bKcal = b.calories / KJ_PER_KCAL
          return bKcal - aKcal
        }
        case "protein":
          return b.protein - a.protein
        case "protein-score": {
          const aScore = Math.max(0, Math.min(100, (a.protein / (Math.round(a.calories / KJ_PER_KCAL) * 0.1)) * 100))
          const bScore = Math.max(0, Math.min(100, (b.protein / (Math.round(b.calories / KJ_PER_KCAL) * 0.1)) * 100))
          return bScore - aScore
        }
        case "kcal-score": {
          const aScore = Math.max(0, Math.min(100, (Math.round(a.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)) * 100))
          const bScore = Math.max(0, Math.min(100, (Math.round(b.calories / KJ_PER_KCAL) / (profile?.targetCalories || 2000)) * 100))
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search your foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={openNew}>
          <Plus data-icon="inline-start" />
          Add food
        </Button>
      </div>

      {foods.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {filtered.length} of {foods.length} {foods.length === 1 ? "food" : "foods"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="sm" variant="outline"><ArrowUpDown className="size-3.5" />Sort</Button>} />
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
          </div>
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
        <p className="py-12 text-center text-muted-foreground">No foods match "{query}".</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((food) => {
            const KJ_PER_KCAL = 4.184
            const caloriesKcal = Math.round(food.calories / KJ_PER_KCAL)
            const caloriesPct = profile?.targetCalories ? Math.round((caloriesKcal / profile.targetCalories) * 100) : 0
            const proteinPct = profile?.targetProtein ? Math.round((food.protein / profile.targetProtein) * 100) : 0
            return (
            <Card key={food.id} className="relative flex flex-row gap-0 overflow-hidden p-0">
              <button
                type="button"
                onClick={() => openEdit(food)}
                className="aspect-square w-20 shrink-0 cursor-pointer bg-muted transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Edit ${food.name}`}
              >
                {food.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={food.imageUrl || "/placeholder.svg"}
                    alt={food.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Apple className="size-8" />
                  </div>
                )}
              </button>
              <div className="absolute right-2 top-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="icon" variant="secondary" className="size-8 shadow-sm" aria-label="Food options" />
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
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(food)}
                    className="cursor-pointer rounded font-medium leading-tight text-balance text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {food.name}
                  </button>
                  {(food.brand || food.servingSize) && (
                    <p className="text-sm text-muted-foreground">
                      {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProteinScoreBadges proteinG={food.protein} kcal={caloriesKcal} />
                  <CalorieDensityBadge kcal={caloriesKcal} servingSize={food.servingSize} />
                </div>
                <MacroBadges
                  kcal={caloriesKcal}
                  kcalPct={profile?.targetCalories ? caloriesPct : null}
                  protein={food.protein}
                  proteinPct={profile?.targetProtein ? proteinPct : null}
                  carbs={food.carbs}
                  fat={food.fat}
                />
                {food.infoUrl && (
                  <a
                    href={food.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    More info
                  </a>
                )}
              </div>
            </Card>
            )
          })}
        </div>
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
