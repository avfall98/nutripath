import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

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
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }
      return isLoggedIn
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
