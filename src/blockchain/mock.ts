import type { AccountId } from "../ledger/types.js";
import type { MinorUnits } from "../ledger/money.js";
import type { BlockchainService, BlockchainBalances, BlockchainTx } from "./types.js";

/**
 * Local development / tests only.
 * Hashes are prefixed mock- and must never be submitted as real Base Sepolia transactions.
 */
export class MockBlockchainService implements BlockchainService {
  readonly mode = "mock" as const;
  private seq = 0;

  async getBalances(_accountId: AccountId): Promise<BlockchainBalances> {
    return { publicOnChain: 0n, encrypted: 0n, source: "mock" };
  }

  async encryptedTransfer(amount: MinorUnits): Promise<BlockchainTx> {
    this.seq += 1;
    return {
      transactionHash: `mock-encrypted-${this.seq}`,
      sender: "business-a",
      recipient: "business-b",
      amount,
      status: "mock",
      mode: "mock",
    };
  }

  async transferToEvm(amount: MinorUnits, recipient: `0x${string}`): Promise<BlockchainTx> {
    this.seq += 1;
    return {
      transactionHash: `mock-unshield-${this.seq}`,
      sender: "business-b",
      recipient,
      amount,
      status: "mock",
      mode: "mock",
    };
  }
}
