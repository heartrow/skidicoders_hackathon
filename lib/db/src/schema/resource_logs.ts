import { pgTable, serial, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceLogsTable = pgTable("resource_logs", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull(),
  date: date("date").notNull(),
  powerKwh: real("power_kwh").notNull(),
  costUsd: real("cost_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResourceLogSchema = createInsertSchema(resourceLogsTable).omit({ id: true, createdAt: true });
export type InsertResourceLog = z.infer<typeof insertResourceLogSchema>;
export type ResourceLog = typeof resourceLogsTable.$inferSelect;
