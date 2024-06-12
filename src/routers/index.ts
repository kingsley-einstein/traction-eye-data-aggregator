import { Router } from "express";
import toolsRouter from "./tools";

const mainRouter = Router();

mainRouter.use("/tools", toolsRouter);

export default mainRouter;
