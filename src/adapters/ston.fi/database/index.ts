import "reflect-metadata";
import { initializeDS, initializeDataSourceAccessor } from "../../../modules";
import { LPEntity } from "./entities/LPEntity";
import { join } from "path";

const datasource = initializeDS({
  entities: [LPEntity],
  whichDBServer: "ston.fi",
  log: true,
  databaseName: "_stonfi_traction_eye",
  migrations: [join(__dirname, "/migrations/*.{ts,js}")],
});

export const lpEntityAccessor = initializeDataSourceAccessor(datasource, LPEntity);
export { datasource as stonFiDS };

// Export default for migration
export default datasource.DS;
