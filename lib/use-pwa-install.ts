"use client"

import { useEffect, useState } from "react"

// The BeforeInstallPromptEvent isn't in the standard TS lib yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

// Capture the event at module scope so it isn't lost if it fires before a
// component that needs it mounts (the browser only dispatches it once).
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    notify()
  })
}

function checkStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function checkIOS(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS reports as Mac; detect touch to catch it.
  const isIPadOS = /macintosh/i.test(ua) && "ontouchend" in document
  return isIOSDevice || isIPadOS
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const update = () => {
      setCanInstall(deferredPrompt !== null)
      setIsStandalone(checkStandalone())
    }
    setIsIOS(checkIOS())
    update()

    listeners.add(update)
    const mql = window.matchMedia("(display-mode: standalone)")
    mql.addEventListener?.("change", update)

    return () => {
      listeners.delete(update)
      mql.removeEventListener?.("change", update)
    }
  }, [])

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === "accepted") {
      deferredPrompt = null
      notify()
      return true
    }
    return false
  }

  return { canInstall, isStandalone, isIOS, promptInstall }
}
