import type { Ledger } from "../ledger/ledger.js";
import type { AccountId } from "../ledger/types.js";
import type { MinorUnits } from "../ledger/money.js";

export type AuthorizeResult = { decision: "APPROVED" } | { decision: "DECLINED" };

/**
 * Real-time card auth MUST use the ledger, not the chain.
 * No ZK proving, no waiting for blocks.
 *
 * Repeating the same authorizationId returns the original decision
 * and does not reserve a second time.
 */
export function authorizeCard(
  ledger: Ledger,
  input: { authorizationId: string; accountId: AccountId; amount: MinorUnits },
): AuthorizeResult {
  const existing = ledger.getAuthorization(input.authorizationId);
  if (existing) {
    return existing.status === "DECLINED" ? { decision: "DECLINED" } : { decision: "APPROVED" };
  }

  const reserved = ledger.reserve(
    input.accountId,
    input.amount,
    `Card auth ${input.authorizationId}`,
    input.authorizationId,
  );

  if (!reserved) {
    ledger.recordDecline(
      input.accountId,
      input.amount,
      `Insufficient available for ${input.authorizationId}`,
      input.authorizationId,
    );
    ledger.putAuthorization({
      authorizationId: input.authorizationId,
      accountId: input.accountId,
      authorizedAmount: input.amount,
      reservedRemaining: 0n,
      status: "DECLINED",
    });
    return { decision: "DECLINED" };
  }

  ledger.putAuthorization({
    authorizationId: input.authorizationId,
    accountId: input.accountId,
    authorizedAmount: input.amount,
    reservedRemaining: input.amount,
    status: "OPEN",
  });
  return { decision: "APPROVED" };
}
