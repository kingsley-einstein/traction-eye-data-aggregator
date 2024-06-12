import { LocalDataSourceType } from "../modules";
import LPAdapterBase from "./lp-base";
import stonFi from "./ston.fi";
import { stonFiDS } from "./ston.fi/database";

export const lpAdapters: Array<LPAdapterBase> = [];
export const datasources: Array<LocalDataSourceType> = [];

lpAdapters.push(stonFi);
datasources.push(stonFiDS);
