import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itunesRouter from "./itunes";
import rssRouter from "./rss";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rssRouter);
router.use(itunesRouter);

export default router;
