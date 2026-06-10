import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import providersRouter from "./providers";
import bookingsRouter from "./bookings";
import ratingsRouter from "./ratings";
import reportsRouter from "./reports";
import statsRouter from "./stats";
import notificationsRouter from "./notifications";
import pushRouter from "./push";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/providers", providersRouter);
router.use("/bookings", bookingsRouter);
router.use("/ratings", ratingsRouter);
router.use("/reports", reportsRouter);
router.use("/stats", statsRouter);
router.use("/notifications", notificationsRouter);
router.use("/push", pushRouter);
router.use("/messages", messagesRouter);

export default router;
