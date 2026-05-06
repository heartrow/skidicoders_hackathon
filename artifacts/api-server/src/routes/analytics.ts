import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  GetResourceAnalyticsQueryParams,
  GetMonthlyTrendsQueryParams,
  GetResourceAnalyticsResponse,
  GetMonthlyTrendsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

router.get("/analytics/resource", async (req, res): Promise<void> => {
  const parsed = GetResourceAnalyticsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const year = parsed.data.year ?? new Date().getFullYear();
  const month = parsed.data.month ?? null;

  const rows = await db.execute(sql`
    SELECT
      rl.zone_id AS "zoneId",
      z.name AS "zoneName",
      COALESCE(SUM(rl.power_kwh), 0) AS "totalPowerKwh",
      COALESCE(SUM(rl.cost_usd), 0) AS "totalCostUsd",
      COALESCE(AVG(rl.power_kwh), 0) AS "avgDailyPowerKwh",
      COALESCE(AVG(rl.cost_usd), 0) AS "avgDailyCostUsd",
      COUNT(rl.id) AS "days"
    FROM resource_logs rl
    JOIN zones z ON z.id = rl.zone_id
    WHERE EXTRACT(YEAR FROM rl.date::date) = ${year}
      ${month != null ? sql`AND EXTRACT(MONTH FROM rl.date::date) = ${month}` : sql``}
    GROUP BY rl.zone_id, z.name
    ORDER BY rl.zone_id
  `);

  const data = (rows as { rows: unknown[] }).rows ?? rows;
  const result = (data as Array<{
    zoneId: number; zoneName: string; totalPowerKwh: string;
    totalCostUsd: string; avgDailyPowerKwh: string; avgDailyCostUsd: string; days: string;
  }>).map(r => ({
    zoneId: Number(r.zoneId),
    zoneName: r.zoneName,
    totalPowerKwh: parseFloat(r.totalPowerKwh),
    totalCostUsd: parseFloat(r.totalCostUsd),
    avgDailyPowerKwh: parseFloat(r.avgDailyPowerKwh),
    avgDailyCostUsd: parseFloat(r.avgDailyCostUsd),
    days: Number(r.days),
  }));

  res.json(GetResourceAnalyticsResponse.parse(result));
});

router.get("/analytics/monthly", async (req, res): Promise<void> => {
  const parsed = GetMonthlyTrendsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const year = parsed.data.year ?? new Date().getFullYear();

  const rows = await db.execute(sql`
    SELECT
      EXTRACT(MONTH FROM rl.date::date)::int AS month,
      EXTRACT(YEAR FROM rl.date::date)::int AS year,
      rl.zone_id AS "zoneId",
      z.name AS "zoneName",
      COALESCE(SUM(rl.power_kwh), 0) AS "powerKwh",
      COALESCE(SUM(rl.cost_usd), 0) AS "costUsd"
    FROM resource_logs rl
    JOIN zones z ON z.id = rl.zone_id
    WHERE EXTRACT(YEAR FROM rl.date::date) = ${year}
    GROUP BY EXTRACT(MONTH FROM rl.date::date), EXTRACT(YEAR FROM rl.date::date), rl.zone_id, z.name
    ORDER BY month, rl.zone_id
  `);

  const data = (rows as { rows: unknown[] }).rows ?? rows;
  type Row = { month: number; year: number; zoneId: number; zoneName: string; powerKwh: string; costUsd: string };
  const rawRows = data as Row[];

  // Group by month
  const byMonth = new Map<number, { month: number; year: number; zones: { zoneId: number; zoneName: string; powerKwh: number; costUsd: number }[] }>();
  for (const r of rawRows) {
    const m = Number(r.month);
    if (!byMonth.has(m)) byMonth.set(m, { month: m, year: Number(r.year), zones: [] });
    byMonth.get(m)!.zones.push({
      zoneId: Number(r.zoneId),
      zoneName: r.zoneName,
      powerKwh: parseFloat(r.powerKwh),
      costUsd: parseFloat(r.costUsd),
    });
  }

  const result = Array.from(byMonth.values()).map(({ month, year: yr, zones }) => ({
    month,
    year: yr,
    label: MONTH_LABELS[month - 1] ?? String(month),
    totalPowerKwh: zones.reduce((s, z) => s + z.powerKwh, 0),
    totalCostUsd: zones.reduce((s, z) => s + z.costUsd, 0),
    zones,
  })).sort((a, b) => a.month - b.month);

  res.json(GetMonthlyTrendsResponse.parse(result));
});

export default router;
