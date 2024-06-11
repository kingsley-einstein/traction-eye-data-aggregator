import {
  DataSource,
  type MixedList,
  type DataSourceOptions,
  type ObjectLiteral,
  type EntityTarget,
  type FindOptionsWhere,
  type FindOptionsOrder,
  type FindOptionsRelations,
  type EntitySchema,
} from "typeorm";
import { ServiceNames } from "../constants";
import { join } from "path";
import { ExcludeFuctionsMapper, OptionalKeysMapper } from "../utils/mappers";

type WhichDBServer = "ston.fi" | "dedust";

const ServerServiceMap = new Map<WhichDBServer, ServiceNames>();

// Set map values
ServerServiceMap.set("ston.fi", ServiceNames.STON_FI);
ServerServiceMap.set("dedust", ServiceNames.DEDUST);

interface LocalDataSourceOpts {
  /**
   * Which database server to use for connection.
   */
  whichDBServer?: "ston.fi" | "dedust";
  /**
   * Port number. Defaults to 5432.
   */
  port?: number;
  /**
   * Username to connect with.
   */
  username?: string;
  /**
   * Password to connect with.
   */
  password?: string;
  /**
   * Migrations to run.
   */
  migrations?: MixedList<string | Function>;
  /**
   * Whether to log SQL queries.
   */
  log?: boolean;
  /**
   * Database name.
   */
  databaseName?: string;

  /**
   * Typeorm subscribers
   */
  subscribers?: MixedList<string | Function>;

  /**
   * Typeorm entities
   */
  entities?: MixedList<string | Function | EntitySchema<any>>;
}

class LocalDataSource {
  public DS: DataSource;

  constructor(
    opts: LocalDataSourceOpts = {
      whichDBServer: "ston.fi",
      port: 5432,
      username: "postgres",
      password: "postgres",
      databaseName: "_tracker_eye",
    }
  ) {
    // Set default values;
    opts.username = opts.username ?? "postgres";
    opts.port = opts.port ?? 5432;
    opts.password = opts.password ?? "postgres";
    opts.whichDBServer = opts.whichDBServer ?? "ston.fi";
    opts.databaseName = opts.databaseName ?? "_tracker_eye";
    opts.migrations = opts.migrations ?? ([] as string[]).concat(join(__dirname, "/migrations/*.{ts,js}"));
    opts.entities =
      opts.entities ??
      ([] as string[]).concat(join(__dirname, "/entities/*.{ts,js}")).concat(join(__dirname, "/models/*.{ts,js}"));
    opts.subscribers = opts.subscribers ?? ([] as string[]).concat(join(__dirname, "/subscribers/*.{ts,js}"));
    opts.log = opts.log ?? false;

    const url = `postgres://${opts.username}:${opts.password}@${ServerServiceMap.get(opts.whichDBServer)}:${
      opts.port
    }/${opts.databaseName}`;
    const opt: DataSourceOptions = {
      url,
      type: "postgres",
      migrations: opts.migrations,
      entities: opts.entities,
      subscribers: opts.subscribers,
      logging: opts.log,
    };

    // Set datasource
    this.DS = new DataSource(opt);
  }

  static constructDefaultDS() {
    return new LocalDataSource();
  }

  /**
   *
   * @param silenceInfoLogs Don't log connection info.
   */
  public connect(silenceInfoLogs?: boolean) {
    this.DS.initialize()
      .then(ds => {
        if (!silenceInfoLogs) {
          console.info("connected to datasource with options: \n");
          console.table(ds.options);
        }
      })
      .catch(error => {
        throw error;
      });
  }

  /**
   *
   * @param silenceInfoLogs Don't log connection info.
   */
  public disconnect(silenceInfoLogs?: boolean) {
    this.DS.destroy()
      .then(() => {
        if (!silenceInfoLogs) console.info("disconnected from datasource");
      })
      .catch(error => {
        throw error;
      });
  }

  public isConnected() {
    return this.DS.isInitialized;
  }

  public async insertEntity<T extends EntityTarget<ObjectLiteral>>(target: T, values: ExcludeFuctionsMapper<T>) {
    try {
      const value = await this.DS.getRepository(target).save(values);
      return value;
    } catch (error) {
      throw error;
    }
  }

  public async querySingleEntity<T extends EntityTarget<ObjectLiteral>>(
    target: T,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    relations?: FindOptionsRelations<T>
  ) {
    try {
      const value = await this.DS.getRepository(target).findOne({ where, relations });
      return value;
    } catch (error) {
      throw error;
    }
  }

  public async queryManyEntities<T extends EntityTarget<ObjectLiteral>>(
    target: T,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    order?: FindOptionsOrder<T>,
    relations?: FindOptionsRelations<T>,
    skip: number = 0,
    take?: number
  ) {
    try {
      const value = await this.DS.getRepository(target).find({ where, order, relations, skip, take });
      return value;
    } catch (error) {
      throw error;
    }
  }

  public async updateEntity<T extends EntityTarget<ObjectLiteral>>(target: T, values: OptionalKeysMapper<T>) {
    try {
      const value = await this.DS.getRepository(target).save(values);
      return value;
    } catch (error) {
      throw error;
    }
  }

  public async deleteEntity<T extends EntityTarget<ObjectLiteral>>(target: T, where: FindOptionsWhere<T>) {
    try {
      const result = await this.DS.getRepository(target).delete(where);
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async entityExists<T extends EntityTarget<ObjectLiteral>>(target: T, where: FindOptionsWhere<T>) {
    try {
      const value = await this.DS.getRepository(target).existsBy(where);
      return value;
    } catch (error) {
      throw error;
    }
  }

  public async countEntities<T extends EntityTarget<ObjectLiteral>>(target: T, where?: FindOptionsWhere<T>) {
    try {
      const value = await this.DS.getRepository(target).count({ where });
      return value;
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Construct main datasource object with default options.
 *
 */
export const initializeDSWithDefaultOptions = () => LocalDataSource.constructDefaultDS();

/**
 *  Construct datasource object.
 * @param opts Initialization options. {@link LocalDataSourceOpts | See implementation}
 */
export const initializeDS = (opts?: LocalDataSourceOpts) => new LocalDataSource(opts);

/**
 * Construct main datasource object with default options, and connect immediately.
 * @param silenceInfoLogs Don't log connection info.
 * @returns
 */
export const initializeConnectedDSWithDefaultOptions = (silenceInfoLogs?: boolean) => {
  try {
    const DS = LocalDataSource.constructDefaultDS();

    // Connect
    DS.connect(silenceInfoLogs);

    return DS;
  } catch (error: any) {
    console.error("an error occured while connecting. error message - %s", error.message);
    return null;
  }
};

/**
 * Construct datasource object, and connect immediately.
 * @param opts Initialization options. {@link LocalDataSourceOpts | See implementation}.
 * @param silenceInfoLogs Don't log connection info.
 * @returns
 */
export const initializeConnectedDS = (opts?: LocalDataSourceOpts, silenceInfoLogs?: boolean) => {
  try {
    const DS = new LocalDataSource(opts);

    // Connect
    DS.connect(silenceInfoLogs);

    return DS;
  } catch (error: any) {
    console.error("an error occured while connecting. error message - %s", error.message);
    return null;
  }
};

export type LocalDataSourceType = LocalDataSource;
