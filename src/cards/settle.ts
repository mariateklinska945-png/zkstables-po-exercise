import type { Ledger } from "../ledger/ledger.js";
import type { MinorUnits } from "../ledger/money.js";

export type SettleResult =
  | { status: "settled" }
  | { status: "duplicate" }
  | { status: "rejected"; reason: string };

/**
 * Settlement is later than authorization and may retry.
 * Idempotency key is settlementId so a duplicate never debits twice.
 */
export function settleCard(
  ledger: Ledger,
  input: { settlementId: string; authorizationId: string; amount: MinorUnits },
): SettleResult {
  if (ledger.hasProcessedSettlement(input.settlementId)) {
    return { status: "duplicate" };
  }

  const auth = ledger.getAuthorization(input.authorizationId);
  if (!auth) return { status: "rejected", reason: "unknown_authorization" };
  if (auth.status === "DECLINED") return { status: "rejected", reason: "authorization_was_declined" };
  if (auth.status === "SETTLED") {
    ledger.markSettlementProcessed(input.settlementId);
    return { status: "duplicate" };
  }

  const accountId = auth.accountId;
  const authorized = auth.authorizedAmount;

  if (input.amount <= authorized) {
    const unused = authorized - input.amount;
    ledger.consumeReserved(
      accountId,
      input.amount,
      `Settle ${input.settlementId} against ${input.authorizationId}`,
      input.settlementId,
    );
    ledger.releaseReservedToAvailable(
      accountId,
      unused,
      `Unused hold from ${input.authorizationId}`,
      input.authorizationId,
    );
  } else {
    const extra = input.amount - authorized;
    const snapshot = ledger.getAccount(accountId);
    if (snapshot.available < extra) {
      return { status: "rejected", reason: "insufficient_available_for_over_auth" };
    }
    ledger.consumeReserved(
      accountId,
      authorized,
      `Settle authorized portion ${input.authorizationId}`,
      input.settlementId,
    );
    const extraOk = ledger.debitAvailable(
      accountId,
      extra,
      `Over-auth extra for ${input.authorizationId}`,
      input.settlementId,
    );
    if (!extraOk) {
      return { status: "rejected", reason: "insufficient_available_for_over_auth" };
    }
  }

  ledger.putAuthorization({ ...auth, reservedRemaining: 0n, status: "SETTLED" });
  ledger.markSettlementProcessed(input.settlementId);
  return { status: "settled" };
}
