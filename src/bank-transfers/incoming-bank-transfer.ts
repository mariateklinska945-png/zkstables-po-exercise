import type { Ledger } from "../ledger/ledger.js";
import type { AccountId } from "../ledger/types.js";
import type { MinorUnits } from "../ledger/money.js";

export type BankTransferResult = { status: "processed" } | { status: "duplicate" };

/**
 * Idempotency: the same bank eventId credits exactly once.
 * Banks retry webhooks; we key on eventId, not on amount.
 */
export function applyIncomingBankTransfer(
  ledger: Ledger,
  input: { eventId: string; accountId: AccountId; amount: MinorUnits },
): BankTransferResult {
  if (ledger.hasProcessedBankEvent(input.eventId)) {
    return { status: "duplicate" };
  }
  ledger.creditAvailable(
    input.accountId,
    input.amount,
    "BANK_CREDIT",
    `Incoming bank transfer ${input.eventId}`,
    input.eventId,
  );
  ledger.markBankEventProcessed(input.eventId);
  return { status: "processed" };
}
