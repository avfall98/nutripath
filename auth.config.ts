import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { NextResponse } from "next/server"

// This project inherited a stale `AUTH_REDIRECT_PROXY_URL` from a previous auth
// setup (Neon Auth / Supabase). Auth.js auto-adopts that env var as its OAuth
// `redirectProxyUrl` (see @auth/core setEnvDefaults), which rewrites the Google
// `redirect_uri` to an origin that isn't registered for this app. In
// production that makes the OAuth callback fail with `error=Configuration`
// after sign-in. This is a single-deployment app that does not use a redirect
// proxy, so we clear the leftover value before Auth.js ever reads it. This
// module is imported by both the middleware (edge) and the server auth
// instance, so the cleanup applies everywhere.
delete (process.env as Record<string, string | undefined>).AUTH_REDIRECT_PROXY_URL

/**
 * Edge-safe Auth.js config shared by the middleware and the full server auth
 * instance. Keep it free of Node-only deps (no db/adapter here) so it can run
 * in the middleware runtime.
 *
 * Providers live in this array — add more here (e.g. GitHub) later without
 * touching the rest of the setup. Google reads AUTH_GOOGLE_ID /
 * AUTH_GOOGLE_SECRET from the environment automatically.
 */
export const authConfig = {
  // Trust the forwarded host headers from the Vercel/preview proxy. Without
  // this, Auth.js falls back to `localhost` when building redirect URLs, which
  // breaks the sign-in redirect inside the preview iframe (and any deployment
  // behind a proxy).
  trustHost: true,
  pages: {
    signIn: "/signin",
  },
  providers: [Google],
  callbacks: {
    // Gate every route except the sign-in page. Returning false makes Auth.js
    // redirect the visitor to `pages.signIn`.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnSignin = nextUrl.pathname === "/signin"
      if (isOnSignin) {
        if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl))
        return true
      }
      if (isLoggedIn) return true
      // Redirect unauthenticated visitors to a clean, relative /signin. We do
      // NOT let Auth.js apply its default behavior of appending
      // `?callbackUrl=<absolute request URL>`: behind the preview/proxy the
      // request host is `localhost`, so that absolute value points off-origin
      // and the preview iframe blocks it. The sign-in flow always returns the
      // user to "/" itself, so the callbackUrl is unnecessary.
      return NextResponse.redirect(new URL("/signin", nextUrl))
    },
    // Expose the user id on the session (JWT strategy stores it on token.sub).
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
} satisfies NextAuthConfig
