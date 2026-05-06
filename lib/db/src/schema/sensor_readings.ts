import { pgTable, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sensorReadingsTable = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull(),
  temperature: real("temperature").notNull(),
  humidity: real("humidity").notNull(),
  soilMoisture: real("soil_moisture").notNull(),
  phLevel: real("ph_level").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadingsTable).omit({ id: true, recordedAt: true });
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadingsTable.$inferSelect;
