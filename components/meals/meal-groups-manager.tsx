"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createMealGroup,
  deleteMealGroup,
  renameMealGroup,
  reorderMealGroups,
} from "@/app/actions/meal-groups"
import type { MealGroupDTO } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react"

const fieldInput =
  "h-12 w-full rounded-md border-0 bg-inset px-3.5 text-base shadow-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"

export function MealGroupsManager({ initialGroups }: { initialGroups: MealGroupDTO[] }) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [, startTransition] = useTransition()

  function refresh() {
    startTransition(() => router.refresh())
  }

  function add() {
    const name = newName.trim()
    if (!name) return
    setNewName("")
    startTransition(async () => {
      await createMealGroup(name)
      toast.success(`Added "${name}".`)
      refresh()
    })
    setGroups((prev) => [...prev, { id: -Date.now(), name, sortOrder: prev.length }])
  }

  function saveRename(id: number) {
    const name = editingName.trim()
    if (!name) return
    setEditingId(null)
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)))
    startTransition(async () => {
      await renameMealGroup(id, name)
      refresh()
    })
  }

  function remove(id: number, name: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
    startTransition(async () => {
      await deleteMealGroup(id)
      toast.success(`Removed "${name}". Existing logs were kept.`)
      refresh()
    })
  }

  function moveRow(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= groups.length) return
    const next = [...groups]
    ;[next[index], next[target]] = [next[target], next[index]]
    setGroups(next)
    startTransition(async () => {
      await reorderMealGroups(next.map((g) => g.id))
      refresh()
    })
  }

  return (
    <Card className="p-6 sm:p-7">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold">Meal groups</CardTitle>
        <CardDescription>Customize how your day is divided. Reorder, rename, or add your own.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="flex items-center gap-3">
          <Input
            placeholder="e.g. Pre-workout, Late night"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                add()
              }
            }}
            className={cn(fieldInput, "flex-1")}
          />
          <button
            type="button"
            onClick={add}
            disabled={!newName.trim()}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-border/70 px-5 text-sm font-bold text-foreground transition-colors hover:border-border hover:bg-muted/40 disabled:opacity-40"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>

        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add groups like Breakfast or Lunch to organize your day.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {groups.map((g, i) => (
              <li
                key={g.id}
                className="flex items-center gap-3 border-t border-border/40 py-3 first:border-t-0"
              >
                <div className="flex flex-col text-faint">
                  <button
                    type="button"
                    aria-label={`Move ${g.name} up`}
                    disabled={i === 0}
                    onClick={() => moveRow(i, -1)}
                    className="transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${g.name} down`}
                    disabled={i === groups.length - 1}
                    onClick={() => moveRow(i, 1)}
                    className="transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>

                {editingId === g.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) saveRename(g.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className={cn(fieldInput, "h-10 flex-1")}
                  />
                ) : (
                  <span className="flex-1 text-base font-bold text-foreground">{g.name}</span>
                )}

                {editingId === g.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Save"
                      onClick={() => saveRename(g.id)}
                      className="flex size-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingId(null)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Rename ${g.name}`}
                      onClick={() => {
                        setEditingId(g.id)
                        setEditingName(g.name)
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${g.name}`}
                      onClick={() => remove(g.id, g.name)}
                      className="flex size-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
