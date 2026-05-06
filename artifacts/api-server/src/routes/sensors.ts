import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, sensorReadingsTable } from "@workspace/db";
import {
  ListSensorsResponse,
  CreateSensorReadingBody,
  GetSensorHistoryQueryParams,
  GetSensorHistoryResponse,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sensors", async (req, res): Promise<void> => {
  // Get the latest reading per zone using a subquery
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (zone_id)
      id, zone_id AS "zoneId", temperature, humidity, soil_moisture AS "soilMoisture", ph_level AS "phLevel", recorded_at AS "recordedAt"
    FROM sensor_readings
    ORDER BY zone_id, recorded_at DESC
  `);
  res.json(ListSensorsResponse.parse(latest.rows));
});

router.post("/sensors", async (req, res): Promise<void> => {
  const parsed = CreateSensorReadingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reading] = await db.insert(sensorReadingsTable).values(parsed.data).returning();
  res.status(201).json({
    id: reading.id,
    zoneId: reading.zoneId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    soilMoisture: reading.soilMoisture,
    phLevel: reading.phLevel,
    recordedAt: reading.recordedAt,
  });
});

router.get("/sensors/history", async (req, res): Promise<void> => {
  const query = GetSensorHistoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { zoneId, limit } = query.data;
  const readings = await db
    .select()
    .from(sensorReadingsTable)
    .where(eq(sensorReadingsTable.zoneId, zoneId))
    .orderBy(desc(sensorReadingsTable.recordedAt))
    .limit(limit ?? 48);
  res.json(GetSensorHistoryResponse.parse(readings.map(r => ({
    id: r.id,
    zoneId: r.zoneId,
    temperature: r.temperature,
    humidity: r.humidity,
    soilMoisture: r.soilMoisture,
    phLevel: r.phLevel,
    recordedAt: r.recordedAt,
  }))));
});

export default router;
