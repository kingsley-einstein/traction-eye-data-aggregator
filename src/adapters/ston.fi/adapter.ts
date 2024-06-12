import assert from "assert";
import { LocalDataSourceAccessorType } from "../../modules";
import { SharedHTTPModule } from "../../shared/http";
import AdapterBase from "../base";
import { LPEntity } from "./database/entities/LPEntity";
import { HttpResponseTypes } from "../../constants";
import { Address, beginCell, fromNano } from "@ton/core";

interface PoolInterface {
  address: string;
  apy_1d: string;
  apy_30d: string;
  apy_7d: string;
  collected_token0_protocol_fee: string;
  collected_token1_protocol_fee: string;
  deprecated: boolean;
  lp_account_address: string;
  lp_balance: string;
  lp_fee: string;
  lp_price_usd: string;
  lp_total_supply: string;
  lp_total_supply_usd: string;
  lp_wallet_address: string;
  protocol_fee: string;
  protocol_fee_address: string;
  ref_fee: string;
  reserve0: string;
  reserve1: string;
  router_address: string;
  token0_address: string;
  token0_balance: string;
  token1_address: string;
  token1_balance: string;
}

export class StonFi extends AdapterBase {
  public _$: SharedHTTPModule;

  constructor(lpDS: LocalDataSourceAccessorType<LPEntity>) {
    super(lpDS);
    this._$ = SharedHTTPModule.constructWithBaseURL("https://api.ston.fi");
  }

  async getAllLPRemote<PoolInterface>(): Promise<PoolInterface[]> {
    this.checkHTTPModuleInitialized();

    try {
      const stonfiV1Pools = await this._$.get<PoolInterface[]>("/api/v1/pools");

      assert.ok(
        stonfiV1Pools.responseType === HttpResponseTypes.SUCCESS,
        "request_to_stonfi_failed with message: " + stonfiV1Pools.data
      );
      return stonfiV1Pools.data as PoolInterface[];
    } catch (error: any) {
      throw error;
    }
  }

  async getAllLPRecordsForUser<LPEntity>(userAddress: string): Promise<LPEntity[]> {
    this.validateAndParseAddress(userAddress);
    const entities = await this.lpDS.readManyEntities({});
    const poolsWithGreaterThan0 = await this.checkLPBalancesForUserAndReturnPools(
      userAddress,
      entities.data.map(x => x.onChainId)
    );

    return <LPEntity[]>entities.data.filter(x => poolsWithGreaterThan0.includes(x.onChainId));
  }

  async checkLPBalancesForUserAndReturnPools(userAddress: string, pools: string[]) {
    try {
      this.validateAndParseAddress(userAddress);
      const poolsGreaterThan0: string[] = [];

      for (const pool of pools) {
        const run0 = await this.CLIENT.runMethod(Address.parse(pool), "get_wallet_address", [
          {
            type: "slice",
            cell: beginCell().storeAddress(Address.parse(userAddress)).endCell(),
          },
        ]);

        const walletAddress = run0.stack.readAddress();

        const run1 = await this.CLIENT.runMethod(walletAddress, "get_wallet_data");
        const balance = Number(fromNano(run1.stack.readBigNumber()));

        if (balance > 0) poolsGreaterThan0.push(pool);
      }

      return poolsGreaterThan0;
    } catch (error: any) {
      throw error;
    }
  }
}
