import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";
import assert from "assert";
import isNil from "lodash/isNil";
import { LocalDataSourceAccessorType } from "../modules";
import { SharedHTTPModule } from "../shared/http";
import { ExcludeFuctionsMapper } from "../utils/mappers";
import { SharedLPEntity } from "../shared/database/entity";

export default abstract class AdapterBase {
  public CLIENT: TonClient | null = null;
  public lpDS: LocalDataSourceAccessorType<SharedLPEntity>;
  public abstract _$: SharedHTTPModule;

  constructor(lpDS: LocalDataSourceAccessorType<SharedLPEntity>) {
    this.lpDS = lpDS;
  }

  async initializeClient() {
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

  abstract getAllLPRemote<S>(): Promise<S[]>;

  deriveNewLPRecord<S extends Record<string, any>, T extends ExcludeFuctionsMapper<SharedLPEntity>>(
    t: S,
    record: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof S>,
    entity: T
  ) {
    assert.ok(
      Object.values(entity).every(k => typeof k === "undefined" || k === null),
      "entity_must_be_empty"
    );
    entity.id = t[record.id];
    entity.onChainId = t[record.onChainId];
    entity.exchangeIdentifier = t[record.exchangeIdentifier];
    entity.reserve0 = t[record.reserve0];
    entity.reserve1 = t[record.reserve1];
    entity.token0Address = t[record.token0Address];
    entity.token1Address = t[record.token1Address];
    return entity;
  }

  abstract getAllLPRecordsForUser<T extends SharedLPEntity>(userAddress: string): Promise<T[]>;

  validateAndParseAddress(userAddress: string) {
    assert.ok(Address.isAddress(userAddress), "invalid_ton_address");
    if (Address.isRaw(userAddress)) {
      userAddress = Address.parse(userAddress).toString();
    }
  }
}
