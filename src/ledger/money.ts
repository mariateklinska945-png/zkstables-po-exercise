/** All money is integer minor units. 42.50 = 4250. Never use JS floats. */
export type MinorUnits = bigint;

export const DEMO_AUTH_AMOUNT: MinorUnits = 4250n; // 42.50
export const DEMO_SETTLE_AMOUNT: MinorUnits = 4000n; // 40.00

export function toMinorUnits(value: number | string | bigint): MinorUnits {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error("Amount must be an integer number of minor units");
    }
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) {
    throw new Error("Amount must be an integer string of minor units");
  }
  return BigInt(value);
}

export function assertPositiveAmount(amount: MinorUnits): void {
  if (amount <= 0n) throw new Error("Amount must be a positive integer of minor units");
}

/**
 * The internal ledger uses 2 decimal places (cents).
 * zkStables tokens use 6 decimal places.
 *
 * Example:
 * 4250 minor units = 42.50 = 42_500_000 zkStables base units.
 */
export function minorUnitsToZkBaseUnits(amount: MinorUnits): bigint {
  return amount * 10_000n;
}

export function zkBaseUnitsToMinorUnits(amount: bigint): MinorUnits {
  if (amount % 10_000n !== 0n) {
    throw new Error(
      "zkStables amount cannot be represented exactly in 2-decimal ledger minor units",
    );
  }

  return amount / 10_000n;
}
