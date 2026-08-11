import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { users, accounts, sessions, verificationTokens, profile, mealGroups } from "@/lib/db/schema"
import { authConfig } from "@/auth.config"

// Default meal groups seeded for every brand-new user so the dashboard has
// sensible sections out of the box.
const DEFAULT_MEAL_GROUPS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT sessions keep the middleware edge-safe (no DB lookup needed to
  // validate a session) while the adapter still persists users and accounts.
  session: { strategy: "jwt" },
  events: {
    // Give first-time users a working empty state: one profile row and the
    // default meal groups. Runs when the adapter creates the user on first
    // OAuth sign-in.
    async createUser({ user }) {
      const userId = user.id
      if (!userId) return
      await db.insert(profile).values({ userId }).onConflictDoNothing()
      await db
        .insert(mealGroups)
        .values(DEFAULT_MEAL_GROUPS.map((name, i) => ({ userId, name, sortOrder: i })))
        .onConflictDoNothing()
    },
  },
})
