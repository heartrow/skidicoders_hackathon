import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id"),
  category: text("category", { enum: ["harvest_timing", "nutrient_adjustment", "lighting_schedule", "watering_cycle", "environmental_control"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
