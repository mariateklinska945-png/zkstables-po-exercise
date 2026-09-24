import { describe, expect, it } from "vitest";
import { applyIncomingBankTransfer } from "../src/bank-transfers/incoming-bank-transfer.js";
import { authorizeCard } from "../src/cards/authorize.js";
import { settleCard } from "../src/cards/settle.js";
import { createDemoLedger } from "../src/ledger/ledger.js";
import { DEMO_AUTH_AMOUNT, DEMO_SETTLE_AMOUNT } from "../src/ledger/money.js";

function fund(ledger: ReturnType<typeof createDemoLedger>, amount = 10000n) {
  applyIncomingBankTransfer(ledger, {
    eventId: "bank-fund",
    accountId: "business-a",
    amount,
  });
}

describe("card authorization", () => {
  it("approves when available funds are sufficient", () => {
    const ledger = createDemoLedger();
    fund(ledger);
    const result = authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    expect(result).toEqual({ decision: "APPROVED" });
  });

  it("declines when available funds are insufficient", () => {
    const ledger = createDemoLedger();
    const result = authorizeCard(ledger, {
      authorizationId: "auth-poor",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    expect(result).toEqual({ decision: "DECLINED" });
    expect(ledger.getAccount("business-a").reserved).toBe(0n);
    expect(ledger.getAccount("business-a").available).toBe(0n);
  });

  it("reserves 42.50 (4250 minor units) on approval", () => {
    const ledger = createDemoLedger();
    fund(ledger);
    authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    const account = ledger.getAccount("business-a");
    expect(account.reserved).toBe(4250n);
    expect(account.available).toBe(5750n);
  });

  it("does not reserve twice for the same authorizationId", () => {
    const ledger = createDemoLedger();
    fund(ledger);
    const first = authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    const second = authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    expect(first.decision).toBe("APPROVED");
    expect(second.decision).toBe("APPROVED");
    expect(ledger.getAccount("business-a").reserved).toBe(4250n);
  });
});

describe("card settlement", () => {
  it("resolves the reservation and can settle a different amount than authorization", () => {
    const ledger = createDemoLedger();
    fund(ledger);
    authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });

    const result = settleCard(ledger, {
      settlementId: "set-001",
      authorizationId: "auth-001",
      amount: DEMO_SETTLE_AMOUNT,
    });

    expect(result).toEqual({ status: "settled" });
    const account = ledger.getAccount("business-a");
    expect(account.reserved).toBe(0n);
    // 10000 - 4250 reserved + 250 unused released = 6000 available; 4000 left the customer
    expect(account.available).toBe(6000n);
  });

  it("does not debit twice for a duplicate settlementId", () => {
    const ledger = createDemoLedger();
    fund(ledger);
    authorizeCard(ledger, {
      authorizationId: "auth-001",
      accountId: "business-a",
      amount: DEMO_AUTH_AMOUNT,
    });
    const first = settleCard(ledger, {
      settlementId: "set-001",
      authorizationId: "auth-001",
      amount: DEMO_SETTLE_AMOUNT,
    });
    const second = settleCard(ledger, {
      settlementId: "set-001",
      authorizationId: "auth-001",
      amount: DEMO_SETTLE_AMOUNT,
    });
    expect(first).toEqual({ status: "settled" });
    expect(second).toEqual({ status: "duplicate" });
    expect(ledger.getAccount("business-a").available).toBe(6000n);
    expect(ledger.getAccount("business-a").reserved).toBe(0n);
  });

  it("covers over-auth from available when funds exist", () => {
    const ledger = createDemoLedger();
    fund(ledger, 10000n);
    authorizeCard(ledger, {
      authorizationId: "auth-over",
      accountId: "business-a",
      amount: 4250n,
    });
    const result = settleCard(ledger, {
      settlementId: "set-over",
      authorizationId: "auth-over",
      amount: 5000n,
    });
    expect(result).toEqual({ status: "settled" });
    const account = ledger.getAccount("business-a");
    expect(account.reserved).toBe(0n);
    expect(account.available).toBe(5000n);
  });

  it("rejects over-auth and keeps the reservation when extra available is missing", () => {
    const ledger = createDemoLedger();
    fund(ledger, 4250n);
    authorizeCard(ledger, {
      authorizationId: "auth-over",
      accountId: "business-a",
      amount: 4250n,
    });
    const result = settleCard(ledger, {
      settlementId: "set-over",
      authorizationId: "auth-over",
      amount: 5000n,
    });
    expect(result).toEqual({
      status: "rejected",
      reason: "insufficient_available_for_over_auth",
    });
    const account = ledger.getAccount("business-a");
    expect(account.reserved).toBe(4250n);
    expect(account.available).toBe(0n);
  });
});
