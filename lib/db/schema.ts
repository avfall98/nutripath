import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  index,
  primaryKey,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

// ---------------------------------------------------------------------------
// Auth.js (NextAuth) tables. Column *property* names must match what
// @auth/drizzle-adapter expects; the DB column names may be snake_case.
// User ids are TEXT (UUID) — every app table references users.id via text().
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

// ---------------------------------------------------------------------------
// App tables — all user-owned. userId is text() referencing users.id.
// ---------------------------------------------------------------------------

// One profile per user: userId is the primary key (no more singleton id=1 row).
export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  age: integer("age"),
  sex: text("sex"),
  heightCm: numeric("height_cm"),
  weightKg: numeric("weight_kg"),
  targetWeightKg: numeric("target_weight_kg"),
  targetCalories: integer("target_calories"),
  targetProtein: integer("target_protein"),
  activityLevel: text("activity_level"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const mealGroups = pgTable(
  "meal_groups",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_groups_user_id_idx").on(t.userId)],
)

export const foods = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    servingSize: text("serving_size"),
    servingsPack: text("servings_pack"),
    packSize: text("pack_size"),
    calories: numeric("calories").notNull().default("0"),
    protein: numeric("protein").notNull().default("0"),
    carbs: numeric("carbs"),
    fat: numeric("fat"),
    saturatedFat: numeric("saturated_fat"),
    sugars: numeric("sugars"),
    dietaryFiber: numeric("dietary_fiber"),
    sodium: numeric("sodium"),
    caloriesPerHundred: numeric("calories_per_hundred"),
    proteinPerHundred: numeric("protein_per_hundred"),
    carbsPerHundred: numeric("carbs_per_hundred"),
    fatPerHundred: numeric("fat_per_hundred"),
    saturatedFatPerHundred: numeric("saturated_fat_per_hundred"),
    sugarsPerHundred: numeric("sugars_per_hundred"),
    dietaryFiberPerHundred: numeric("dietary_fiber_per_hundred"),
    sodiumPerHundred: numeric("sodium_per_hundred"),
    imageUrl: text("image_url"),
    infoUrl: text("info_url"),
    favourite: boolean("favourite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("foods_user_id_idx").on(t.userId)],
)

export const entries = pgTable(
  "entries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    mealGroupId: integer("meal_group_id"),
    mealGroupName: text("meal_group_name").notNull(),
    foodId: integer("food_id"),
    name: text("name").notNull(),
    servingSize: text("serving_size"),
    calories: numeric("calories").notNull().default("0"),
    protein: numeric("protein").notNull().default("0"),
    carbs: numeric("carbs"),
    fat: numeric("fat"),
    quantity: numeric("quantity").notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entries_user_id_idx").on(t.userId)],
)

// A saved, named combination of library foods eaten as one thing. Nutrition is
// never stored here — it's always summed from the ingredients at read time.
export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    favourite: boolean("favourite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meals_user_id_idx").on(t.userId)],
)

// One row per ingredient in a meal. amount + mode describe how much of the
// referenced library food is used: mode "serving" -> amount is a serving count;
// mode "weight" -> amount is grams/ml in the food's own serving unit.
export const mealIngredients = pgTable(
  "meal_ingredients",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    amount: numeric("amount").notNull().default("1"),
    mode: text("mode").notNull().default("serving"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("meal_ingredients_meal_id_idx").on(t.mealId)],
)

// Composite primary key (userId, entryDate) so skipped days don't collide across users.
export const skippedDays = pgTable(
  "skipped_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.entryDate] })],
)

export type User = typeof users.$inferSelect
export type Profile = typeof profile.$inferSelect
export type MealGroup = typeof mealGroups.$inferSelect
export type Food = typeof foods.$inferSelect
export type Entry = typeof entries.$inferSelect
export type SkippedDay = typeof skippedDays.$inferSelect
export type Meal = typeof meals.$inferSelect
export type MealIngredient = typeof mealIngredients.$inferSelect
