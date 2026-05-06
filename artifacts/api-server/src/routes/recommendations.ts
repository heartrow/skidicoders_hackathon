import { Router, type IRouter } from "express";
import { db, recommendationsTable } from "@workspace/db";
import { ListRecommendationsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recommendations", async (req, res): Promise<void> => {
  const recommendations = await db
    .select()
    .from(recommendationsTable)
    .orderBy(recommendationsTable.createdAt);
  res.json(ListRecommendationsResponse.parse(recommendations));
});

export default router;
