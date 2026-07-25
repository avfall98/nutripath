"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Apple, CalendarDays, CalendarRange, Salad, UserRound } from "lucide-react"

const links = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/profile", label: "Profile", icon: UserRound },
]

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-40 hidden h-16 md:block">
        <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between bg-background px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Salad className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">NutriTrack</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-bold transition-colors",
                  active
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground hover:text-white",
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-black md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
