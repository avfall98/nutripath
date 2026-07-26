import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AppNav } from "@/components/app-nav"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import { InstallBanner } from "@/components/pwa/install-app"
import "./globals.css"

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "NutriTrack — Nutrition & Fitness Tracker",
  description:
    "Track your daily meals, calories, and protein against your goals. Build a reusable food library with photos and links.",
  generator: "v0.app",
  applicationName: "NutriTrack",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NutriTrack",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#121212",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${instrumentSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased pb-20 md:pb-0 md:pl-0 md:pt-16">
        <AppNav />
        {children}
        <InstallBanner />
        <ServiceWorkerRegister />
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
