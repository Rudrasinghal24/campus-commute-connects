import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import attendanceRouter from "./attendance";
import paymentsRouter from "./payments";
import suspiciousRouter from "./suspicious";
import overridesRouter from "./overrides";
import tripsRouter from "./trips";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/students", studentsRouter);
router.use("/attendance", attendanceRouter);
router.use("/payments", paymentsRouter);
router.use("/suspicious", suspiciousRouter);
router.use("/overrides", overridesRouter);
router.use("/trips", tripsRouter);

export default router;
