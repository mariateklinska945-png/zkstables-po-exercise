import cors from "cors";
import express from "express";
import { applyIncomingBankTransfer } from "../bank-transfers/incoming-bank-transfer.js";
import type { BlockchainService } from "../blockchain/types.js";
import { authorizeCard } from "../cards/authorize.js";
import { settleCard } from "../cards/settle.js";
import { toMinorUnits } from "../ledger/money.js";
import type { Ledger } from "../ledger/ledger.js";
import { isAccountId } from "../ledger/types.js";

function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)),
  ) as T;
}

export function createApp(ledger: Ledger, blockchain: BlockchainService) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, blockchainMode: blockchain.mode });
  });

  app.get("/api/balance/:accountId", async (req, res) => {
    const accountId = req.params.accountId;
    if (!isAccountId(accountId)) {
      res.status(400).json({ error: "Unknown accountId" });
      return;
    }
    const ledgerBalance = ledger.getAccount(accountId);
    const chain = await blockchain.getBalances(accountId);
    res.json(
      serializeBigInt({
        accountId,
        ledger: {
          available: ledgerBalance.available,
          reserved: ledgerBalance.reserved,
        },
        blockchain: chain,
      }),
    );
  });

  app.get("/api/ledger/events", (_req, res) => {
    res.json(serializeBigInt({ events: ledger.getEvents() }));
  });

  app.post("/api/transfers/encrypted", async (req, res) => {
    try {
      const { amount } = req.body ?? {};

      if (amount === undefined) {
        res.status(400).json({ error: "integer amount is required" });
        return;
      }

      const result = await blockchain.encryptedTransfer(toMinorUnits(amount));
      res.json(serializeBigInt(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transfer failed";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/transfers/to-evm", async (req, res) => {
    try {
      const { amount, recipient } = req.body ?? {};

      if (
        amount === undefined ||
        typeof recipient !== "string" ||
        !/^0x[a-fA-F0-9]{40}$/.test(recipient)
      ) {
        res.status(400).json({
          error: "integer amount and valid EVM recipient are required",
        });
        return;
      }

      const result = await blockchain.transferToEvm(
        toMinorUnits(amount),
        recipient as `0x${string}`,
      );

      res.json(serializeBigInt(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transfer failed";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/bank-transfer", (req, res) => {
    const { eventId, accountId, amount } = req.body ?? {};
    if (!eventId || !isAccountId(accountId) || amount === undefined) {
      res.status(400).json({ error: "eventId, accountId, and integer amount are required" });
      return;
    }
    const result = applyIncomingBankTransfer(ledger, {
      eventId: String(eventId),
      accountId,
      amount: toMinorUnits(amount),
    });
    res.json(result);
  });

  app.post("/api/cards/authorize", (req, res) => {
    const { authorizationId, accountId, amount } = req.body ?? {};
    if (!authorizationId || !isAccountId(accountId) || amount === undefined) {
      res.status(400).json({ error: "authorizationId, accountId, and integer amount are required" });
      return;
    }
    const result = authorizeCard(ledger, {
      authorizationId: String(authorizationId),
      accountId,
      amount: toMinorUnits(amount),
    });
    res.json(result);
  });

  app.post("/api/cards/settle", (req, res) => {
    const { settlementId, authorizationId, amount } = req.body ?? {};
    if (!settlementId || !authorizationId || amount === undefined) {
      res.status(400).json({ error: "settlementId, authorizationId, and integer amount are required" });
      return;
    }
    const result = settleCard(ledger, {
      settlementId: String(settlementId),
      authorizationId: String(authorizationId),
      amount: toMinorUnits(amount),
    });
    const status = result.status === "rejected" ? 400 : 200;
    res.status(status).json(result);
  });

  return app;
}
