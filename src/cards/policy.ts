/**
 * DECISION: over-auth settlement uses extra AVAILABLE funds, else reject and keep reservation.
 * WHY: authorization is a hold; the final amount can be higher (tip/FX) but we must not go negative.
 * TRADE-OFF: a retry can succeed after another bank credit; we do not auto-partial-settle.
 */
export const OVER_AUTH_POLICY = "cover_from_available_or_reject" as const;
