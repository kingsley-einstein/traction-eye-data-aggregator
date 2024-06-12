import "reflect-metadata";
import { initializeDS, initializeDataSourceAccessor } from "../../../modules";
import { LPEntity } from "./entities/LPEntity";

const datasource = initializeDS({
  entities: [LPEntity],
  whichDBServer: "ston.fi",
  log: true,
});

export const lpEntityAccessor = initializeDataSourceAccessor(datasource, LPEntity);

// Export default for migration
export default datasource.DS;
