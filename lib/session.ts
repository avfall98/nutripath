import "server-only"
import { auth } from "@/auth"
import { PREVIEW_USER_ID, isPreviewBypassEnabled } from "@/lib/preview-auth"

/**
 * Returns the current signed-in user's id, read from the server-side session
 * only. Throws if there is no session — callers (server actions) must never
 * accept a userId from client input.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (userId) return userId
  // No session: fall back to the fixed test user in non-production previews so
  // their data renders as demo data. Never active in production.
  if (isPreviewBypassEnabled()) return PREVIEW_USER_ID as string
  throw new Error("Unauthorized")
}
