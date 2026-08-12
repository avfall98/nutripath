import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// Edge-safe auth instance (no adapter) used purely to gate routes via the
// `authorized` callback in auth.config.ts.
export default NextAuth(authConfig).auth

export const config = {
  // Run on everything except Next internals, the Auth.js API, and static/PWA
  // assets. The sign-in page is allowed through by the `authorized` callback.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:png|svg|ico|json|txt|webmanifest)$).*)",
  ],
}
