import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id"),
  severity: text("severity", { enum: ["critical", "warning", "info"] }).notNull(),
  type: text("type", { enum: ["temperature_high", "temperature_low", "humidity_high", "humidity_low", "ph_out_of_range", "soil_dry", "reservoir_low", "system_offline"] }).notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["active", "acknowledged", "resolved"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
