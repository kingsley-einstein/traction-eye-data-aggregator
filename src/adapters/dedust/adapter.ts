import assert from "assert";
import { LocalDataSourceAccessorType } from "../../modules";
import { SharedHTTPModule } from "../../shared/http";
import LPAdapterBase, { LPData } from "../lp-base";
import { LPEntity } from "./database/entities/LPEntity";
import { HttpResponseTypes, LPSourceIdentifiers, ProxyTONs } from "../../constants";
import { ExcludeFuctionsMapper } from "../../utils/mappers";
import { SharedLPEntity } from "../../shared/database/entity";
import { isContractInitialized, runMethod, validateAndParseAddress } from "../../utils/chain-utils";
import { Address, beginCell, fromNano } from "@ton/core";

interface DedustAssetInterface {
  address?: string;
  type: "jetton" | "native";
}

interface DedustPoolStatsInterface {
  fees: string[];
  volume: string[];
}

interface DedustPoolInterface {
  address: string;
  totalSupply: string;
  tradeFee: string;
  assets: DedustAssetInterface[];
  lastPrice: string | null;
  reserves: string[];
  stats: DedustPoolStatsInterface;
}

// Ston.fi's API response pool structure
interface NativePoolInterface {
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

export class Dedust extends LPAdapterBase {
  public _$: SharedHTTPModule;

  constructor(lpDS: LocalDataSourceAccessorType<LPEntity>) {
    super(lpDS);
    this._$ = SharedHTTPModule.constructWithBaseURL("https://api.dedust.io");
  }

  private dedustPoolInterfaceToNativePoolInterface(d: DedustPoolInterface): NativePoolInterface {
    return {
      address: d.address,
      apy_1d: "0",
      apy_30d: "0",
      apy_7d: "0",
      lp_account_address: "",
      lp_balance: "0",
      lp_total_supply: d.totalSupply,
      lp_fee: d.tradeFee,
      lp_price_usd: d.lastPrice ?? "0",
      deprecated: false,
      lp_total_supply_usd: "uncalculated",
      lp_wallet_address: "",
      ref_fee: "0",
      reserve0: d.reserves[0],
      reserve1: d.reserves[1],
      token0_address: d.assets[0].type === "native" ? ProxyTONs.DEDUST : d.assets[0].address,
      token1_address: d.assets[1].type === "native" ? ProxyTONs.DEDUST : d.assets[1].address,
      token0_balance: "uncalculated",
      token1_balance: "uncalculated",
      collected_token0_protocol_fee: "0",
      collected_token1_protocol_fee: "0",
      router_address: "does_not_apply",
      protocol_fee: "does_not_apply",
      protocol_fee_address: "does_not_apply",
    };
  }

  async getAllLPRemote<NativePoolInterface>(): Promise<NativePoolInterface[]> {
    this.checkHTTPModuleInitialized();

    try {
      const dedustV2Pools = await this._$.get<DedustPoolInterface[]>("/v2/pools");

      assert.ok(
        dedustV2Pools.responseType === HttpResponseTypes.SUCCESS,
        "request to dedust failed with message: " + dedustV2Pools.data
      );
      return (dedustV2Pools.data as DedustPoolInterface[]).map<NativePoolInterface>(
        d => this.dedustPoolInterfaceToNativePoolInterface(d) as NativePoolInterface
      );
    } catch (error: any) {
      throw error;
    }
  }

  async insertPoolsInDB() {
    try {
      const allLPs = await this.lpDS.readManyEntities({ exchangeIdentifier: LPSourceIdentifiers.DEDUST });
      const dedustPools = await this.getAllLPRemote<NativePoolInterface>();
      const dedustPoolsFilter = dedustPools.filter(pool => !allLPs.data.map(en => en.onChainId).includes(pool.address));
      const derivedRecordsMapper: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof NativePoolInterface> =
        {} as any;

      derivedRecordsMapper.lpFee = "lp_fee";
      derivedRecordsMapper.onChainId = "address";
      derivedRecordsMapper.priceUSD = "lp_price_usd";
      derivedRecordsMapper.reserve0 = "reserve0";
      derivedRecordsMapper.reserve1 = "reserve1";
      derivedRecordsMapper.token0Address = "token0_address";
      derivedRecordsMapper.token1Address = "token1_address";

      const derivedRecords = dedustPoolsFilter.map(x =>
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
      const allLPs = await this.lpDS.readManyEntities({ exchangeIdentifier: LPSourceIdentifiers.DEDUST });
      const dedustPools = await this.getAllLPRemote<NativePoolInterface>();
      const dedustPoolsFilter = dedustPools.filter(pool => allLPs.data.map(en => en.onChainId).includes(pool.address));
      const derivedRecordsMapper: Record<keyof ExcludeFuctionsMapper<SharedLPEntity>, keyof NativePoolInterface> =
        {} as any;

      // The only values that could possibly change
      derivedRecordsMapper.lpFee = "lp_fee";
      derivedRecordsMapper.priceUSD = "lp_price_usd";
      derivedRecordsMapper.reserve0 = "reserve0";
      derivedRecordsMapper.reserve1 = "reserve1";

      const mutatedRecords = dedustPoolsFilter.map(x =>
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
    const poolsByUser = await this.getAllLPRemoteForWallet<NativePoolInterface>(userAddress);

    return <LPEntity[]>entities.data.filter(x => poolsByUser.map(p => p.address).includes(x.onChainId));
  }

  async getAllLPRemoteForWallet<NativePoolInterface>(userAddress: string): Promise<NativePoolInterface[]> {
    this.checkHTTPModuleInitialized();
    validateAndParseAddress(userAddress);

    try {
      const dedustV1Pools = await this._$.get<{ pool_list: NativePoolInterface[] }>(`/v1/wallets/${userAddress}/pools`);

      assert.ok(
        dedustV1Pools.responseType === HttpResponseTypes.SUCCESS,
        "request to dedust failed with message: " + dedustV1Pools.data
      );
      return (dedustV1Pools.data as { pool_list: NativePoolInterface[] }).pool_list;
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
      const walletData = await runMethod(this.CLIENT, userWalletAddress.toString(), "get_wallet_data");
      const balance = walletData.readBigNumber();

      // Get pool data
      const poolJettonData = await runMethod(this.CLIENT, poolAddress, "get_jetton_data");
      const poolData = await runMethod(this.CLIENT, poolAddress, "get_pool_data");

      const totalSupply = poolJettonData.readBigNumber();
      const reserve0 = poolData.readBigNumber();
      const reserve1 = poolData.readBigNumber();
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
        token0Amount: percentage * Number(fromNano(reserve0)),
        token1Amount: percentage * Number(fromNano(reserve1)),
      };
    } catch (error: any) {
      throw error;
    }
  }
}
