import express, { Application } from "express";
import cron from "node-cron";
import cors from "cors";
import morgan from "morgan";
import { lpAdapters, datasources } from "./adapters";
import mainRouter from "./routers";
import { errorMiddleware } from "./middlewares/error";

const app: Application = express();
const port: number = parseInt(process.env.PORT || "8809");

app.use(morgan("combined"));
app.use(cors());

app.use("/", mainRouter);
app.use(errorMiddleware);

const connectDatasources = () => datasources.forEach(ds => ds.connect());
const insertPools = () =>
  lpAdapters.forEach(async ad => {
    try {
      await ad.insertPoolsInDB();
    } catch (error: any) {
      console.error(error);
    }
  });

const schedule = cron.schedule("*/2 * * * * *", () => {
  try {
    console.info("running insert operation for LPs");
    insertPools();
  } catch (error: any) {
    console.error(error);
  }
});

app.listen(port, () => {
  connectDatasources();
  //setTimeout(() => schedule.start(), 5000);
  console.log("server running on " + port);
});
