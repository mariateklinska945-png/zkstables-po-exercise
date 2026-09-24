import type { MinorUnits } from "./money.js";

export type AccountId = "business-a" | "business-b";

export type LedgerEventType =
  | "BANK_CREDIT"
  | "CARD_RESERVE"
  | "CARD_AUTH_DECLINED"
  | "CARD_SETTLE"
  | "CARD_RESERVE_RELEASE"
  | "CHAIN_CREDIT_PENDING"
  | "CHAIN_DEBIT_PENDING";

export type LedgerEvent = {
  id: string;
  at: string;
  accountId: AccountId;
  type: LedgerEventType;
  amount: MinorUnits;
  availableAfter: MinorUnits;
  reservedAfter: MinorUnits;
  note: string;
  /** Bank eventId, card authorizationId, or chain tx hash when we have one. */
  externalId?: string;
};

export type AccountState = {
  accountId: AccountId;
  available: MinorUnits;
  reserved: MinorUnits;
};

export type AuthorizationStatus = "OPEN" | "SETTLED" | "DECLINED";

export type Authorization = {
  authorizationId: string;
  accountId: AccountId;
  authorizedAmount: MinorUnits;
  reservedRemaining: MinorUnits;
  status: AuthorizationStatus;
};

export function isAccountId(value: string): value is AccountId {
  return value === "business-a" || value === "business-b";
}
