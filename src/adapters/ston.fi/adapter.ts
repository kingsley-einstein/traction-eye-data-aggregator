import assert from "assert";
import { LocalDataSourceAccessorType } from "../../modules";
import { SharedHTTPModule } from "../../shared/http";
import LPAdapterBase, { LPData } from "../lp-base";
import { LPEntity } from "./database/entities/LPEntity";
import { HttpResponseTypes, LPSourceIdentifiers, STON_FI_ROUTER } from "../../constants";
import { ExcludeFuctionsMapper } from "../../utils/mappers";
import { SharedLPEntity } from "../../shared/database/entity";
import { isContractInitialized, runMethod, validateAndParseAddress } from "../../utils/chain-utils";
import isNil from "lodash/isNil";
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

export class StonFi extends LPAdapterBase {
  public _$: SharedHTTPModule;

  constructor(lpDS: LocalDataSourceAccessorType<LPEntity>) {
    super(lpDS);
    this._$ = SharedHTTPModule.constructWithBaseURL("https://api.ston.fi");
  }

  async getAllLPRemote<PoolInterface>(): Promise<PoolInterface[]> {
    this.checkHTTPModuleInitialized();

    try {
      const stonfiV1Pools = await this._$.get<{ pool_list: PoolInterface[] }>("/v1/pools");

      assert.ok(
        stonfiV1Pools.responseType === HttpResponseTypes.SUCCESS,
        "request to stonfi failed with message: " + stonfiV1Pools.data
      );
      return (stonfiV1Pools.data as { pool_list: PoolInterface[] }).pool_list;
    } catch (error: any) {
      throw error;
    }
  }

  async insertPoolsInDB() {
    try {
      const allLPs = await this.lpDS.readManyEntities({ exchangeIdentifier: LPSourceIdentifiers.STON_FI });
      const stonfiPools = await this.getAllLPRemote<PoolInterface>();
      const stonfiPoolsFilter = stonfiPools.filter(pool => !allLPs.data.map(en => en.onChainId).includes(pool.address));
      const derivedRecordsMapper: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof PoolInterface> = {} as any;

      derivedRecordsMapper.lpFee = "lp_fee";
      derivedRecordsMapper.onChainId = "address";
      derivedRecordsMapper.priceUSD = "lp_price_usd";
      derivedRecordsMapper.reserve0 = "reserve0";
      derivedRecordsMapper.reserve1 = "reserve1";
      derivedRecordsMapper.token0Address = "token0_address";
      derivedRecordsMapper.token1Address = "token1_address";

      const derivedRecords = stonfiPoolsFilter.map(x =>
        this.deriveNewLPRecord(x, derivedRecordsMapper, {} as ExcludeFuctionsMapper<LPEntity>)
      );
      const insertionPromises = derivedRecords.map(record => this.lpDS.insertEntity(record));
      const insertionPromisesResolved = await Promise.all(insertionPromises);

      assert.ok(
        insertionPromisesResolved.every(op => op.responseType === "success"),
        "insertion_not_entirely_successful"
      );
    } catch (error: any) {
      throw error;
    }
  }

  async updateExistingPoolsInDB() {
    try {
      const allLPs = await this.lpDS.readManyEntities({ exchangeIdentifier: LPSourceIdentifiers.STON_FI });
      const stonfiPools = await this.getAllLPRemote<PoolInterface>();
      const stonfiPoolsFilter = stonfiPools.filter(pool => allLPs.data.map(en => en.onChainId).includes(pool.address));
      const derivedRecordsMapper: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof PoolInterface> = {} as any;

      // The only values that could possibly change
      derivedRecordsMapper.lpFee = "lp_fee";
      derivedRecordsMapper.priceUSD = "lp_price_usd";
      derivedRecordsMapper.reserve0 = "reserve0";
      derivedRecordsMapper.reserve1 = "reserve1";

      const mutatedRecords = stonfiPoolsFilter.map(x =>
        this.mutateLPRecord(
          x,
          derivedRecordsMapper,
          allLPs.data.find(s => s.onChainId === x.address)
        )
      );
      const updatePromises = mutatedRecords.map(record => this.lpDS.updateEntity(record as any));
      const updatePromisesResolved = await Promise.all(updatePromises);

      assert.ok(
        updatePromisesResolved.every(op => op.responseType === "success"),
        "update_not_entirely_successful"
      );
    } catch (error: any) {
      throw error;
    }
  }

  async getAllLPRecordsForUser<LPEntity>(userAddress: string): Promise<LPEntity[]> {
    validateAndParseAddress(userAddress);
    const entities = await this.lpDS.readManyEntities({});
    const poolsByUser = await this.getAllLPRemoteForWallet<PoolInterface>(userAddress);

    return <LPEntity[]>entities.data.filter(x => poolsByUser.map(p => p.address).includes(x.onChainId));
  }

  async getAllLPRemoteForWallet<PoolInterface>(userAddress: string): Promise<PoolInterface[]> {
    this.checkHTTPModuleInitialized();
    validateAndParseAddress(userAddress);

    try {
      const stonfiV1Pools = await this._$.get<{ pool_list: PoolInterface[] }>(`/v1/wallets/${userAddress}/pools`);

      assert.ok(
        stonfiV1Pools.responseType === HttpResponseTypes.SUCCESS,
        "request to stonfi failed with message: " + stonfiV1Pools.data
      );
      return (stonfiV1Pools.data as { pool_list: PoolInterface[] }).pool_list;
    } catch (error: any) {
      throw error;
    }
  }

  async getLPAccountData(poolAddress: string, userAddress: string): Promise<LPData> {
    try {
      // Check that client is initialized
      this.checkClientInitialized();
      // Validate addresses
      validateAndParseAddress(poolAddress);
      validateAndParseAddress(userAddress);

      // Parse addresses
      const user = Address.parse(userAddress);

      // Get user wallet address for pool
      const userWalletAddress = (
        await runMethod(this.CLIENT, poolAddress, "get_wallet_address", [
          { type: "slice", cell: beginCell().storeAddress(user).endCell() },
        ])
      ).readAddress();

      const userWalletInitialized = await isContractInitialized(this.CLIENT, userWalletAddress.toString());

      assert.ok(userWalletInitialized, "wallet_not_active_for_this_pool");

      // Get wallet data
      const walletData = (await runMethod(this.CLIENT, userWalletAddress.toString(), "get_wallet_data"))
      const balance = walletData.readBigNumber();

      // Get pool data
      const poolJettonData = (await runMethod(this.CLIENT, poolAddress, "get_jetton_data"));
      const poolData = (await runMethod(this.CLIENT, poolAddress, "get_pool_data"));

      const totalSupply = poolJettonData.readBigNumber();
      const reserve0 = poolData.readNumber();
      const reserve1 = poolData.readNumber();
      const token0WalletAddress = poolData.readAddress();
      const token1WalletAddress = poolData.readAddress();

      // Get associated Jettons for wallets
      const token0 = (await runMethod(this.CLIENT, token0WalletAddress.toString(), "get_wallet_data"))
        .skip(2)
        .readAddress()
        .toString();
      const token1 = (await runMethod(this.CLIENT, token1WalletAddress.toString(), "get_wallet_data"))
        .skip(2)
        .readAddress()
        .toString();

      // Percentage held by user
      const percentage = Number(balance) / Number(totalSupply);
      return {
        token0,
        token1,
        token0Amount: Number(fromNano(percentage * Number(reserve0))),
        token1Amount: Number(fromNano(percentage * Number(reserve1))),
      };
    } catch (error: any) {
      throw error;
    }
  }
}
