import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, controlsTable } from "@workspace/db";
import {
  ListControlsResponse,
  UpdateControlParams,
  UpdateControlBody,
  UpdateControlResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/controls", async (req, res): Promise<void> => {
  const controls = await db.select().from(controlsTable).orderBy(controlsTable.zoneId, controlsTable.type);
  res.json(ListControlsResponse.parse(controls));
});

router.patch("/controls/:id", async (req, res): Promise<void> => {
  const params = UpdateControlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateControlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [control] = await db
    .update(controlsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(controlsTable.id, params.data.id))
    .returning();
  if (!control) {
    res.status(404).json({ error: "Control not found" });
    return;
  }
  res.json(UpdateControlResponse.parse(control));
});

export default router;
