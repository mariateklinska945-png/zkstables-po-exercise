import type { AccountId } from "../ledger/types.js";
import type { MinorUnits } from "../ledger/money.js";

export type BlockchainBalances = {
  publicOnChain: MinorUnits;
  encrypted: MinorUnits;
  source: "mock" | "real";
};

export type BlockchainTx = {
  transactionHash: string;
  sender: string;
  recipient: string;
  amount: MinorUnits;
  status: "mock" | "submitted" | "failed";
  mode: "mock" | "real";
};

export interface BlockchainService {
  mode: "mock" | "real";
  getBalances(accountId: AccountId): Promise<BlockchainBalances>;
  encryptedTransfer(amount: MinorUnits): Promise<BlockchainTx>;
  transferToEvm(amount: MinorUnits, recipient: `0x${string}`): Promise<BlockchainTx>;
}
