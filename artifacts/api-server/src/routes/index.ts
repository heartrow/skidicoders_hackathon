import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zonesRouter from "./zones";
import sensorsRouter from "./sensors";
import controlsRouter from "./controls";
import alertsRouter from "./alerts";
import recommendationsRouter from "./recommendations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zonesRouter);
router.use(sensorsRouter);
router.use(controlsRouter);
router.use(alertsRouter);
router.use(recommendationsRouter);
router.use(dashboardRouter);

export default router;
