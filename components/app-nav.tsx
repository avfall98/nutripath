"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Apple, CalendarDays, Salad, UserRound } from "lucide-react"

const links = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/meals", label: "Meal Groups", icon: Salad },
  { href: "/profile", label: "Profile", icon: UserRound },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Salad className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">NutriTrack</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
