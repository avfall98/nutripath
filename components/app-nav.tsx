"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Apple, CalendarDays, CalendarRange, LogOut, Salad, UserRound } from "lucide-react"
import { signOutAction } from "@/app/actions/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const links = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/profile", label: "Profile", icon: UserRound },
]

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export type NavUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function initials(user: NavUser) {
  const base = user.name || user.email || "?"
  return base.trim().charAt(0).toUpperCase()
}

function UserMenu({ user, align = "end" }: { user: NavUser; align?: "end" | "center" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar className="size-8">
          {user.image ? <AvatarImage src={user.image || "/placeholder.svg"} alt="" /> : null}
          <AvatarFallback className="bg-sidebar-accent text-xs font-bold text-white">
            {initials(user)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          {user.name ? <span className="truncate font-bold">{user.name}</span> : null}
          {user.email ? (
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => {
            void signOutAction()
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppNav({ user }: { user: NavUser | null }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // No chrome on the sign-in screen (or when signed out).
  if (pathname === "/signin" || !user) return null

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
              const active = mounted && isActive(href, pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-bold transition-colors",
                    active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:text-white",
                  )}
                >
                  {label}
                </Link>
              )
            })}
            <div className="ml-2">
              <UserMenu user={user} />
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile floating account button (top-right) */}
      <div className="fixed right-3 top-3 z-40 md:hidden">
        <div className="rounded-full bg-background/80 p-0.5 backdrop-blur">
          <UserMenu user={user} />
        </div>
      </div>

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
