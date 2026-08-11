import "server-only"
import { auth } from "@/auth"

/**
 * Returns the current signed-in user's id, read from the server-side session
 * only. Throws if there is no session — callers (server actions) must never
 * accept a userId from client input.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Unauthorized")
  return userId
}
