"use client"

import { useState } from "react"
import { Download, Share, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePwaInstall } from "@/lib/use-pwa-install"
import { cn } from "@/lib/utils"

function IOSInstructions({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install NutriTrack</DialogTitle>
          <DialogDescription>Add NutriTrack to your Home Screen for a full-screen, app-like experience.</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">1</span>
            <span className="flex items-center gap-1.5">
              Tap the <Share className="size-4 text-primary" aria-hidden="true" /> <strong>Share</strong> icon in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">2</span>
            <span className="flex items-center gap-1.5">
              Choose <Plus className="size-4 text-primary" aria-hidden="true" /> <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">3</span>
            <span>Tap <strong>Add</strong> in the top-right corner.</span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}

/** Install button suitable for placing inside settings / profile. */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isStandalone, isIOS, promptInstall } = usePwaInstall()
  const [showIOS, setShowIOS] = useState(false)

  // Already installed — nothing to do.
  if (isStandalone) return null
  // Nothing to prompt on non-iOS browsers that don't support install.
  if (!canInstall && !isIOS) return null

  async function handleClick() {
    if (isIOS && !canInstall) {
      setShowIOS(true)
      return
    }
    await promptInstall()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className={cn("h-11 gap-2 rounded-full px-5 text-sm font-bold", className)}
      >
        <Download className="size-4" aria-hidden="true" />
        Install app
      </Button>
      <IOSInstructions open={showIOS} onOpenChange={setShowIOS} />
    </>
  )
}

const DISMISS_KEY = "nutritrack-install-banner-dismissed"

/** Subtle, dismissible banner shown above the mobile nav / bottom of screen. */
export function InstallBanner() {
  const { canInstall, isStandalone, isIOS, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.sessionStorage.getItem(DISMISS_KEY) === "1"
  })
  const [showIOS, setShowIOS] = useState(false)

  if (isStandalone || dismissed) return null
  if (!canInstall && !isIOS) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {}
  }

  async function handleInstall() {
    if (isIOS && !canInstall) {
      setShowIOS(true)
      return
    }
    const installed = await promptInstall()
    if (installed) dismiss()
  }

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4 md:bottom-4 md:left-auto md:right-4 md:mx-0 md:max-w-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="region"
        aria-label="Install app"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-card p-3 pl-4 shadow-lg ring-1 ring-border">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Download className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Install NutriTrack</p>
            <p className="truncate text-xs text-muted-foreground">Add it to your home screen for quick access.</p>
          </div>
          <Button type="button" onClick={handleInstall} className="h-9 shrink-0 rounded-full px-4 text-xs font-bold">
            Install
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <IOSInstructions open={showIOS} onOpenChange={setShowIOS} />
    </>
  )
}
