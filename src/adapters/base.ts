import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import assert from "assert";

export default abstract class AdapterBase {
  public CLIENT: TonClient | null = null;

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
    assert.ok(!!this.CLIENT, "client_uninitialized");
  }
}
