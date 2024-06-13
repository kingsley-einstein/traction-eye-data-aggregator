import { Address, type TupleItem, type TonClient } from "@ton/ton";
import assert from "assert";

export const validateAndParseAddress = (userAddress: string) => {
  assert.ok(Address.isAddress(Address.parse(userAddress)), "invalid_ton_address");
  if (Address.isRaw(userAddress)) {
    userAddress = Address.parse(userAddress).toString();
  }
};

export const runMethod = async (client: TonClient, address: string, methodName: string, stack?: TupleItem[]) => {
  try {
    const val = await client.runMethod(Address.parse(address), methodName, stack);
    return val.stack;
  } catch (error) {
    throw error;
  }
};

export const isInitialized = async (client: TonClient, contractAddress: string) => {
  try {
    const contract = await client.getContractState(Address.parse(contractAddress));
    return contract.state === "active";
  } catch (error: any) {
    throw error;
  }
}
