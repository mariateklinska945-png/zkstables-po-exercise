import { createFullClient, createRuntime } from "@zkstables/sdk";
import { baseSepolia } from "viem/chains";

import type { AccountId } from "../ledger/types.js";
import {
  minorUnitsToZkBaseUnits,
  zkBaseUnitsToMinorUnits,
  type MinorUnits,
} from "../ledger/money.js";
import type {
  BlockchainService,
  BlockchainBalances,
  BlockchainTx,
} from "./types.js";

const TOKEN = "zkUSD" as const;

export class RealBlockchainService implements BlockchainService {
  readonly mode = "real" as const;

  private runtime: ReturnType<typeof createRuntime> | undefined;

  private async getContext() {
    const mnemonic = process.env.ZKSTABLES_MNEMONIC;

    if (!mnemonic) {
      throw new Error(
        "ZKSTABLES_MNEMONIC is required when BLOCKCHAIN_MODE=real",
      );
    }

    if (!this.runtime) {
      this.runtime = createRuntime();
    }

    const runtime = this.runtime;

    // Two independent business accounts derived from one test seed.
    const accountA = runtime.createAccountFromMnemonic(mnemonic, 0);
    const accountB = runtime.createAccountFromMnemonic(mnemonic, 1);

    const clientA = await createFullClient({
      chain: baseSepolia,
      zkpAccount: accountA,
    });

    const clientB = await createFullClient({
      chain: baseSepolia,
      zkpAccount: accountB,
    });

    return {
      runtime,
      accountA,
      accountB,
      clientA,
      clientB,
    };
  }

  private async getAccount(accountId: AccountId) {
    const ctx = await this.getContext();

    if (accountId === "business-a") {
      return {
        account: ctx.accountA,
        client: ctx.clientA,
      };
    }

    return {
      account: ctx.accountB,
      client: ctx.clientB,
    };
  }

  async getBalances(accountId: AccountId): Promise<BlockchainBalances> {
    const { account, client } = await this.getAccount(accountId);

    const encryptedBaseUnits = await client.getDecryptedBalance({
      token: TOKEN,
    });

    const publicBaseUnits = await client.getPublicTokenBalance({
      token: TOKEN,
      owner: account.controllerAddress,
    });

    return {
      publicOnChain: zkBaseUnitsToMinorUnits(publicBaseUnits),
      encrypted: zkBaseUnitsToMinorUnits(encryptedBaseUnits),
      source: "real",
    };
  }

  /**
   * Exercise flow: business-a sends an encrypted transfer to business-b.
   */
  async encryptedTransfer(amount: MinorUnits): Promise<BlockchainTx> {
    const ctx = await this.getContext();

    const result = await ctx.clientA.sendEncryptedTransfer({
      token: TOKEN,
      amount: minorUnitsToZkBaseUnits(amount),
      to: ctx.accountB.zkpAddress,
    });

    return {
      transactionHash: result.transactionHash,
      sender: ctx.accountA.zkpAddress,
      recipient: ctx.accountB.zkpAddress,
      amount,
      status: "submitted",
      mode: "real",
    };
  }

  /**
   * Exercise flow: business-b moves encrypted funds to a plain EVM address.
   */
  async transferToEvm(
    amount: MinorUnits,
    recipient: `0x${string}`,
  ): Promise<BlockchainTx> {
    const ctx = await this.getContext();

    const result = await ctx.clientB.sendEncryptedToPublicTransfer({
      token: TOKEN,
      amount: minorUnitsToZkBaseUnits(amount),
      recipient,
    });

    return {
      transactionHash: result.transactionHash,
      sender: ctx.accountB.zkpAddress,
      recipient,
      amount,
      status: "submitted",
      mode: "real",
    };
  }

  async registerAccounts() {
    const ctx = await this.getContext();

    const registrationA = await ctx.clientA.sendRegisterEpk({
      token: TOKEN,
      controller: ctx.accountA.controllerAddress,
    });

    const registrationB = await ctx.clientB.sendRegisterEpk({
      token: TOKEN,
      controller: ctx.accountB.controllerAddress,
    });

    return {
      businessA: {
        zkpAddress: ctx.accountA.zkpAddress,
        controllerAddress: ctx.accountA.controllerAddress,
        transactionHash: registrationA.transactionHash,
      },
      businessB: {
        zkpAddress: ctx.accountB.zkpAddress,
        controllerAddress: ctx.accountB.controllerAddress,
        transactionHash: registrationB.transactionHash,
      },
    };
  }

  async getAccountAddresses() {
    const ctx = await this.getContext();

    return {
      businessA: {
        zkpAddress: ctx.accountA.zkpAddress,
        controllerAddress: ctx.accountA.controllerAddress,
      },
      businessB: {
        zkpAddress: ctx.accountB.zkpAddress,
        controllerAddress: ctx.accountB.controllerAddress,
      },
    };
  }
}
