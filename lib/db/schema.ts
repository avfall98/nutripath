import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
  boolean,
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
