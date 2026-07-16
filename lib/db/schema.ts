import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core"

export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
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

export const mealGroups = pgTable("meal_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  servingSize: text("serving_size"),
  calories: numeric("calories").notNull().default("0"),
  protein: numeric("protein").notNull().default("0"),
  carbs: numeric("carbs"),
  fat: numeric("fat"),
  imageUrl: text("image_url"),
  infoUrl: text("info_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").notNull(),
  mealGroupId: integer("meal_group_id"),
  mealGroupName: text("meal_group_name").notNull(),
  foodId: integer("food_id"),
  name: text("name").notNull(),
  calories: numeric("calories").notNull().default("0"),
  protein: numeric("protein").notNull().default("0"),
  carbs: numeric("carbs"),
  fat: numeric("fat"),
  quantity: numeric("quantity").notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Profile = typeof profile.$inferSelect
export type MealGroup = typeof mealGroups.$inferSelect
export type Food = typeof foods.$inferSelect
export type Entry = typeof entries.$inferSelect
