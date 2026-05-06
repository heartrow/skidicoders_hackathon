import { Router, type IRouter } from "express";
import { eq, count, avg } from "drizzle-orm";
import { db, zonesTable, sensorReadingsTable, controlsTable, alertsTable, recommendationsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [zoneStats] = await db
    .select({
      totalZones: count(),
      activeZones: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`,
    })
    .from(zonesTable);

  const [alertStats] = await db
    .select({
      activeAlerts: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`,
      criticalAlerts: sql<number>`COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical')`,
    })
    .from(alertsTable);

  const [sensorAvgs] = await db
    .select({
      avgTemperature: avg(sensorReadingsTable.temperature),
      avgHumidity: avg(sensorReadingsTable.humidity),
      avgPhLevel: avg(sensorReadingsTable.phLevel),
      avgSoilMoisture: avg(sensorReadingsTable.soilMoisture),
    })
    .from(sensorReadingsTable);

  const [controlStats] = await db
    .select({
      activeControls: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
    })
    .from(controlsTable);

  const [recStats] = await db
    .select({
      pendingRecommendations: count(),
    })
    .from(recommendationsTable);

  const summary = {
    totalZones: Number(zoneStats?.totalZones ?? 0),
    activeZones: Number(zoneStats?.activeZones ?? 0),
    activeAlerts: Number(alertStats?.activeAlerts ?? 0),
    criticalAlerts: Number(alertStats?.criticalAlerts ?? 0),
    avgTemperature: Number(sensorAvgs?.avgTemperature ?? 0),
    avgHumidity: Number(sensorAvgs?.avgHumidity ?? 0),
    avgPhLevel: Number(sensorAvgs?.avgPhLevel ?? 0),
    avgSoilMoisture: Number(sensorAvgs?.avgSoilMoisture ?? 0),
    activeControls: Number(controlStats?.activeControls ?? 0),
    pendingRecommendations: Number(recStats?.pendingRecommendations ?? 0),
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
