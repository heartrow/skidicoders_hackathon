import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  ListAlertsQueryParams,
  ListAlertsResponse,
  AcknowledgeAlertParams,
  AcknowledgeAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let alerts;
  if (query.data.status) {
    alerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.status, query.data.status))
      .orderBy(alertsTable.createdAt);
  } else {
    alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);
  }

  res.json(ListAlertsResponse.parse(alerts));
});

router.patch("/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [alert] = await db
    .update(alertsTable)
    .set({ status: "acknowledged", updatedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json(AcknowledgeAlertResponse.parse(alert));
});

export default router;
