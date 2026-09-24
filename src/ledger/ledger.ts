import { assertPositiveAmount, type MinorUnits } from "./money.js";
import type { AccountId, AccountState, Authorization, LedgerEvent } from "./types.js";

/**
 * Internal ledger = what OUR SERVICE believes the customer can spend.
 * This is separate from public on-chain balance and encrypted zkStables balance.
 */
export class Ledger {
  private accounts = new Map<AccountId, AccountState>();
  private events: LedgerEvent[] = [];
  private eventSeq = 0;
  private processedBankEventIds = new Set<string>();
  private processedSettlementIds = new Set<string>();
  private authorizations = new Map<string, Authorization>();

  constructor(accountIds: AccountId[]) {
    for (const id of accountIds) {
      this.accounts.set(id, { accountId: id, available: 0n, reserved: 0n });
    }
  }

  getAccount(accountId: AccountId): AccountState {
    const account = this.require(accountId);
    return { ...account };
  }

  getEvents(): LedgerEvent[] {
    return [...this.events];
  }

  hasProcessedBankEvent(eventId: string): boolean {
    return this.processedBankEventIds.has(eventId);
  }

  markBankEventProcessed(eventId: string): void {
    this.processedBankEventIds.add(eventId);
  }

  hasProcessedSettlement(settlementId: string): boolean {
    return this.processedSettlementIds.has(settlementId);
  }

  markSettlementProcessed(settlementId: string): void {
    this.processedSettlementIds.add(settlementId);
  }

  getAuthorization(authorizationId: string): Authorization | undefined {
    const auth = this.authorizations.get(authorizationId);
    return auth ? { ...auth } : undefined;
  }

  putAuthorization(auth: Authorization): void {
    this.authorizations.set(auth.authorizationId, { ...auth });
  }

  creditAvailable(
    accountId: AccountId,
    amount: MinorUnits,
    type: LedgerEvent["type"],
    note: string,
    externalId?: string,
  ): void {
    assertPositiveAmount(amount);
    const account = this.require(accountId);
    account.available += amount;
    this.record(account, type, amount, note, externalId);
  }

  /** Move available → reserved. Used at card authorization time. */
  reserve(accountId: AccountId, amount: MinorUnits, note: string, externalId?: string): boolean {
    assertPositiveAmount(amount);
    const account = this.require(accountId);
    if (account.available < amount) return false;
    account.available -= amount;
    account.reserved += amount;
    this.record(account, "CARD_RESERVE", amount, note, externalId);
    return true;
  }

  releaseReservedToAvailable(
    accountId: AccountId,
    amount: MinorUnits,
    note: string,
    externalId?: string,
  ): void {
    if (amount === 0n) return;
    assertPositiveAmount(amount);
    const account = this.require(accountId);
    if (account.reserved < amount) throw new Error("Cannot release more than reserved");
    account.reserved -= amount;
    account.available += amount;
    this.record(account, "CARD_RESERVE_RELEASE", amount, note, externalId);
  }

  /** Consume reserved funds (actual card settlement). Money leaves the customer. */
  consumeReserved(
    accountId: AccountId,
    amount: MinorUnits,
    note: string,
    externalId?: string,
  ): void {
    assertPositiveAmount(amount);
    const account = this.require(accountId);
    if (account.reserved < amount) {
      throw new Error("Cannot settle more than reserved without extra available");
    }
    account.reserved -= amount;
    this.record(account, "CARD_SETTLE", amount, note, externalId);
  }

  debitAvailable(
    accountId: AccountId,
    amount: MinorUnits,
    note: string,
    externalId?: string,
  ): boolean {
    assertPositiveAmount(amount);
    const account = this.require(accountId);
    if (account.available < amount) return false;
    account.available -= amount;
    this.record(account, "CARD_SETTLE", amount, note, externalId);
    return true;
  }

  recordDecline(
    accountId: AccountId,
    amount: MinorUnits,
    note: string,
    externalId?: string,
  ): void {
    const account = this.require(accountId);
    this.record(account, "CARD_AUTH_DECLINED", amount, note, externalId);
  }

  private require(accountId: AccountId): AccountState {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Unknown account ${accountId}`);
    return account;
  }

  private record(
    account: AccountState,
    type: LedgerEvent["type"],
    amount: MinorUnits,
    note: string,
    externalId?: string,
  ): void {
    this.eventSeq += 1;
    this.events.push({
      id: `evt-${this.eventSeq}`,
      at: new Date().toISOString(),
      accountId: account.accountId,
      type,
      amount,
      availableAfter: account.available,
      reservedAfter: account.reserved,
      note,
      externalId,
    });
  }
}

export function createDemoLedger(): Ledger {
  return new Ledger(["business-a", "business-b"]);
}
