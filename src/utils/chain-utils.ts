import { Address, type TupleItem, type TonClient, Cell } from "@ton/ton";
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

export const isContractInitialized = async (client: TonClient, contractAddress: string) => {
  try {
    const contract = await client.getContractState(Address.parse(contractAddress));
    return contract.state === "active";
  } catch (error: any) {
    throw error;
  }
};

// https://github.com/ston-fi/sdk/blob/main/src/utils/parseAddress.ts
export const parseAddressFromCell = (cell: Cell) => {
  try {
    const cell = new Cell();

    let n = readIntFromBitString(cell.bits, 3, 8);

    if (n > BigInt(127)) {
      n = n - BigInt(256);
    }

    const hashPart = readIntFromBitString(cell.bits, 3 + 8, 256);

    if (`${n.toString(10)}:${hashPart.toString(16)}` === "0:0") {
      return null;
    }

    const s = `${n.toString(10)}:${hashPart.toString(16).padStart(64, "0")}`;
    return Address.parse(s);
  } catch (error) {
    return null;
  }
};

// https://github.com/ston-fi/sdk/blob/main/src/utils/parseAddress.ts
const readIntFromBitString = (bs: Cell["bits"], cursor: number, bits: number) => {
  let n = BigInt(0);

  for (let i = 0; i < bits; i++) {
    n *= BigInt(2);
    n += BigInt(bs.at(cursor + i));
  }

  return n;
};
