import { describe, expect, it } from "vitest";
import { applyIncomingBankTransfer } from "../src/bank-transfers/incoming-bank-transfer.js";
import { createDemoLedger } from "../src/ledger/ledger.js";

describe("incoming bank transfer", () => {
  it("credits available once", () => {
    const ledger = createDemoLedger();
    const result = applyIncomingBankTransfer(ledger, {
      eventId: "bank-001",
      accountId: "business-a",
      amount: 10000n,
    });

    expect(result).toEqual({ status: "processed" });
    expect(ledger.getAccount("business-a").available).toBe(10000n);
    expect(ledger.getAccount("business-b").available).toBe(0n);
  });

  it("does not credit twice when the same eventId is retried", () => {
    const ledger = createDemoLedger();
    const first = applyIncomingBankTransfer(ledger, {
      eventId: "bank-001",
      accountId: "business-a",
      amount: 10000n,
    });
    const second = applyIncomingBankTransfer(ledger, {
      eventId: "bank-001",
      accountId: "business-a",
      amount: 10000n,
    });

    expect(first).toEqual({ status: "processed" });
    expect(second).toEqual({ status: "duplicate" });
    expect(ledger.getAccount("business-a").available).toBe(10000n);
  });
});
