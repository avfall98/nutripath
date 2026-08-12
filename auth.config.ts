import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { NextResponse } from "next/server"

/**
 * Resolve the OAuth redirect proxy URL.
 *
 * Google (and OAuth providers generally) only allow pre-registered
 * `redirect_uri`s. Preview and sandbox deployments have dynamic URLs that can
 * never all be registered, so every OAuth callback must route through ONE
 * stable, registered URL — the canonical production deployment — using Auth.js's
 * redirect-proxy feature. Auth.js appends `/callback/google` to this value, so
 * it must be the auth base path, e.g. `https://your-app.vercel.app/api/auth`,
 * and the resulting callback URL must be listed in the Google console.
 *
 * CRITICAL: this value must resolve to the SAME origin on every deployment —
 * previews AND the production/proxy deployment itself. Auth.js decides whether a
 * deployment is "on the proxy" by comparing this origin to the request origin
 * (see @auth/core init.ts `isOnRedirectProxy`). If production doesn't have it
 * set, it fails to recognize the proxied Google callback, can't find the
 * sign-in cookies (they live on the preview domain), and throws
 * `error=Configuration`.
 *
 * Resolution order:
 *   1. `AUTH_REDIRECT_PROXY_URL` env var — the known-correct, Google-registered
 *      origin (set on Production and Preview in Vercel).
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's canonical production domain,
 *      injected at runtime on every deployment.
 *   3. `CANONICAL_AUTH_PROXY_URL` — a hardcoded last resort so environments that
 *      load NONE of the above still proxy correctly. This matters for the v0
 *      sandbox / `next dev`, whose local env contains neither var; without it
 *      `redirectProxyUrl` would be undefined there, the sandbox's own
 *      unregistered callback URL would be sent to Google, and sign-in would
 *      fail with `redirect_uri_mismatch`.
 *
 * Invalid candidates are skipped so a malformed value can't make Auth.js throw
 * (`error=Configuration`) during init.
 */
const CANONICAL_AUTH_PROXY_URL = "https://nutripath-alpha-nine.vercel.app/api/auth"

function resolveRedirectProxyUrl(): string | undefined {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const candidates = [
    process.env.AUTH_REDIRECT_PROXY_URL,
    productionUrl ? `https://${productionUrl}/api/auth` : undefined,
    CANONICAL_AUTH_PROXY_URL,
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      // Must be a valid absolute URL or @auth/core throws during init.
      new URL(candidate)
      return candidate
    } catch {
      // Ignore a malformed candidate and try the next one.
    }
  }
  return undefined
}

const redirectProxyUrl = resolveRedirectProxyUrl()

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
  // Route OAuth callbacks through the canonical (registered) production URL so
  // preview/sandbox deployments can complete sign-in. On the production
  // deployment itself this is a no-op (Auth.js detects it is already on the
  // proxy origin and uses the local callback). `resolveRedirectProxyUrl` always
  // returns the canonical URL, so this is defined in every environment.
  redirectProxyUrl,
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
