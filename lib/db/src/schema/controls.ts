import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const controlsTable = pgTable("controls", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull(),
  type: text("type", { enum: ["led_lighting", "cooling_fan", "water_pump", "nutrient_pump"] }).notNull(),
  isActive: boolean("is_active").notNull().default(false),
  intensity: integer("intensity"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertControlSchema = createInsertSchema(controlsTable).omit({ id: true, updatedAt: true });
export type InsertControl = z.infer<typeof insertControlSchema>;
export type Control = typeof controlsTable.$inferSelect;
