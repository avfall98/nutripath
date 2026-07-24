import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AppNav } from "@/components/app-nav"
import "./globals.css"

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "NutriTrack — Nutrition & Fitness Tracker",
  description:
    "Track your daily meals, calories, and protein against your goals. Build a reusable food library with photos and links.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#121212",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${instrumentSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased pb-20 md:pb-0 md:pl-[220px]">
        <AppNav />
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
