import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";
import assert from "assert";
import isNil from "lodash/isNil";
import { LocalDataSourceAccessorType } from "../modules";
import { SharedHTTPModule } from "../shared/http";
import { ExcludeFuctionsMapper } from "../utils/mappers";
import { SharedLPEntity } from "../shared/database/entity";

export default abstract class LPAdapterBase {
  public CLIENT: TonClient | null = null;
  public lpDS: LocalDataSourceAccessorType<SharedLPEntity>;
  public abstract _$: SharedHTTPModule;

  constructor(lpDS: LocalDataSourceAccessorType<SharedLPEntity>) {
    this.lpDS = lpDS;
  }

  async initializeTONClient() {
    try {
      const endpoint = await getHttpEndpoint();
      this.CLIENT = new TonClient({ endpoint });
    } catch (error: any) {
      console.info("an error occured while initializing client\n");
      console.error(error);
      this.CLIENT = null;
    }
  }

  checkClientInitialized() {
    assert.ok(!isNil(this.CLIENT), "client_uninitialized");
  }

  checkHTTPModuleInitialized() {
    assert.ok(!isNil(this._$), "http_module_not_initialized");
  }

  abstract getAllLPRemote<T>(): Promise<T[]>;
  abstract insertPoolsInDB(): Promise<void>;

  deriveNewLPRecord<S extends Record<string, any>, T extends ExcludeFuctionsMapper<SharedLPEntity>>(
    t: S,
    record: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof S>,
    entity: T
  ) {
    assert.ok(
      Object.values(entity).every(k => typeof k === "undefined" || k === null),
      "entity_must_be_empty"
    );
    entity.onChainId = t[record.onChainId];
    entity.reserve0 = t[record.reserve0];
    entity.reserve1 = t[record.reserve1];
    entity.token0Address = t[record.token0Address];
    entity.token1Address = t[record.token1Address];
    entity.lpFee = t[record.lpFee];
    entity.priceUSD = t[record.priceUSD];
    return entity;
  }

  abstract getAllLPRecordsForUser<T extends SharedLPEntity>(userAddress: string): Promise<T[]>;

  getAllLPRecords(skip: number = 0, limit: number = 20): Promise<SharedLPEntity[]> {
    return this.lpDS
      .readManyEntities(undefined, undefined, undefined, skip, limit)
      .then(resp => {
        if (resp.responseType === "success") return resp.data;
        else {
          return Promise.reject(new Error(resp.error));
        }
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  validateAndParseAddress(userAddress: string) {
    assert.ok(Address.isAddress(userAddress), "invalid_ton_address");
    if (Address.isRaw(userAddress)) {
      userAddress = Address.parse(userAddress).toString();
    }
  }
}
