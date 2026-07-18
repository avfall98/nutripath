"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteFood } from "@/app/actions/foods"
import type { FoodDTO, ProfileDTO } from "@/lib/types"
import { FoodFormDialog } from "@/components/foods/food-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Apple, ExternalLink, MoreVertical, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react"

export function FoodLibrary({ foods, profile }: { foods: FoodDTO[]; profile: ProfileDTO | null }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodDTO | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q),
    )
  }, [foods, query])

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
            const caloriesPct = profile?.targetCalories ? Math.round((food.calories / profile.targetCalories) * 100) : 0
            const proteinPct = profile?.targetProtein ? Math.round((food.protein / profile.targetProtein) * 100) : 0
            return (
            <Card key={food.id} className="relative flex flex-row gap-0 overflow-hidden p-0">
              <div className="aspect-square w-32 shrink-0 bg-muted">
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
              </div>
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
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="font-medium leading-tight text-balance">{food.name}</h3>
                  {(food.brand || food.servingSize) && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[food.brand, food.servingSize].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">
                    {Math.round(food.calories)} kcal
                    {profile?.targetCalories && ` (${caloriesPct}%)`}
                  </Badge>
                  <Badge variant="secondary">
                    {Math.round(food.protein)}g protein
                    {profile?.targetProtein && ` (${proteinPct}%)`}
                  </Badge>
                  {food.carbs != null && <Badge variant="outline">{Math.round(food.carbs)}g carbs</Badge>}
                  {food.fat != null && <Badge variant="outline">{Math.round(food.fat)}g fat</Badge>}
                </div>
                {food.infoUrl && (
                  <a
                    href={food.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
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
