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
 * We derive it from `VERCEL_PROJECT_PRODUCTION_URL` (injected by Vercel and
 * always the canonical production domain) so it is correct on every deployment
 * without hardcoding. We fall back to `AUTH_REDIRECT_PROXY_URL` only if it is a
 * valid absolute URL — a malformed value would otherwise make Auth.js throw and
 * surface as `error=Configuration`. The stale value this project inherited from
 * a previous Neon/Supabase auth setup pointed off-domain, which is exactly what
 * broke the production callback.
 */
function resolveRedirectProxyUrl(): string | undefined {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const candidates = [
    productionUrl ? `https://${productionUrl}/api/auth` : undefined,
    process.env.AUTH_REDIRECT_PROXY_URL,
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
  // proxy origin and uses the local callback). Undefined when no canonical URL
  // is known (e.g. plain `next dev`), in which case the local callback is used.
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
