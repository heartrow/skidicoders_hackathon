import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cropType: text("crop_type").notNull(),
  rackCount: integer("rack_count").notNull().default(1),
  status: text("status", { enum: ["active", "idle", "maintenance"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
