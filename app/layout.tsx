import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { auth } from "@/auth"
import { isPreviewBypassEnabled } from "@/lib/preview-auth"
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const user = session?.user
    ? { name: session.user.name, email: session.user.email, image: session.user.image }
    : isPreviewBypassEnabled()
      ? { name: "Preview", email: null, image: null }
      : null

  return (
    <html lang="en" className={`dark bg-background ${instrumentSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased pb-20 md:pb-0 md:pl-0 md:pt-16">
        <AppNav user={user} />
        {children}
        <InstallBanner />
        <ServiceWorkerRegister />
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          swipeDirections={["down", "left", "right"]}
          offset={{ bottom: 16 }}
          mobileOffset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))", left: 12, right: 12 }}
        />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
