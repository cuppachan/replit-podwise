import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rssRouter from "./rss";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rssRouter);

export default router;
