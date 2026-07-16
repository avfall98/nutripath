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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react"

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
    // optimistic
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a meal group</CardTitle>
        </CardHeader>
        <CardContent>
          <InputGroup>
            <InputGroupInput
              placeholder="e.g. Pre-workout, Late night"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) add()
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={add} disabled={!newName.trim()}>
                <Plus data-icon="inline-start" />
                Add
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>No meal groups</EmptyTitle>
            <EmptyDescription>Add groups like Breakfast or Lunch to organize your day.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your meal groups</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="flex flex-col divide-y divide-border">
              {groups.map((g, i) => (
                <li key={g.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => moveRow(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label="Move down"
                      disabled={i === groups.length - 1}
                      onClick={() => moveRow(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
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
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium">{g.name}</span>
                  )}

                  {editingId === g.id ? (
                    <>
                      <Button size="icon" variant="ghost" className="size-8" aria-label="Save" onClick={() => saveRename(g.id)}>
                        <Check />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8" aria-label="Cancel" onClick={() => setEditingId(null)}>
                        <X />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Rename ${g.name}`}
                        onClick={() => {
                          setEditingId(g.id)
                          setEditingName(g.name)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        aria-label={`Delete ${g.name}`}
                        onClick={() => remove(g.id, g.name)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
