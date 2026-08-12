/**
 * Preview sign-in bypass.
 *
 * Lets the app be viewed without a real Google sign-in in NON-PRODUCTION
 * environments (the v0 dev preview, `next dev`, and Vercel preview
 * deployments). When enabled, the app behaves as if a fixed test user is
 * signed in, so their food data is used as demo data.
 *
 * Production is never affected: the bypass is disabled whenever
 * `VERCEL_ENV === "production"`, and it also requires `PREVIEW_USER_ID` to be
 * set. Keep this module edge-safe (env reads only) so it can run inside the
 * middleware runtime via auth.config.ts.
 */
export const PREVIEW_USER_ID = process.env.PREVIEW_USER_ID

export function isPreviewBypassEnabled(): boolean {
  return process.env.VERCEL_ENV !== "production" && !!PREVIEW_USER_ID
}
