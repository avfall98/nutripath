"use server"

import { signIn, signOut } from "@/auth"

// Server actions wrapping Auth.js sign-in/sign-out so the client nav and
// sign-in screen don't need a SessionProvider or client-side auth SDK.
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" })
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" })
}
