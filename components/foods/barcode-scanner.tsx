"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ScanBarcode } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (barcode: string) => void
}

/** Play a short, soft beep using the Web Audio API (no asset needed). */
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
    osc.onended = () => ctx.close().catch(() => {})
  } catch {
    // Audio is best-effort only.
  }
}

export function BarcodeScanner({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const handledRef = useRef(false)
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting")
  const [errorMsg, setErrorMsg] = useState("")

  // Keep the latest callbacks in refs so the camera effect only depends on `open`.
  // Otherwise a new callback identity on every parent render would tear down and
  // re-init the camera in a loop, leaving a black video frame.
  const onDetectedRef = useRef(onDetected)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onDetectedRef.current = onDetected
    onOpenChangeRef.current = onOpenChange
  }, [onDetected, onOpenChange])

  useEffect(() => {
    if (!open) return

    handledRef.current = false
    setStatus("starting")
    setErrorMsg("")

    // Focus on standard retail barcode formats (EAN-13, UPC-A, EAN-8, UPC-E).
    const hints = new Map<DecodeHintType, unknown>()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_E,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints as Map<DecodeHintType, any>, 300)
    readerRef.current = reader
    let cancelled = false

    // Prefer the rear-facing camera on mobile for scanning product barcodes.
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    }

    reader
      .decodeFromConstraints(constraints, videoRef.current!, (result, err) => {
        if (cancelled) return
        setStatus("scanning")
        if (result && !handledRef.current) {
          const text = result.getText().replace(/\D/g, "")
          // Accept standard 8/12/13-digit retail barcodes.
          if (text.length >= 8 && text.length <= 14) {
            handledRef.current = true
            playBeep()
            reader.reset()
            onDetectedRef.current(text)
            onOpenChangeRef.current(false)
          }
        }
      })
      .catch((e: any) => {
        if (cancelled) return
        console.log("[v0] Barcode scanner init failed:", e)
        setStatus("error")
        setErrorMsg(
          e?.name === "NotAllowedError"
            ? "Camera access was denied. Enable camera permissions and try again."
            : "Could not start the camera. Check that a camera is available.",
        )
      })

    return () => {
      cancelled = true
      readerRef.current?.reset()
      readerRef.current = null
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" />
            Scan barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at a product barcode (EAN-13 or UPC-A). Detection is automatic.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="size-full object-cover" autoPlay playsInline muted />

          {/* Aiming guide */}
          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-1/3 w-4/5 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              Starting camera...
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {errorMsg}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
