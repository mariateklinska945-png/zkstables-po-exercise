# Answers

## 1. Founder says: use an MPC wallet, bank holds one share, customer holds the other, and the bank co-signs every transaction. Is that the actual key model?

No. The zkStables account model used here has two distinct keys: an ESK (Grumpkin) for balance decryption and ZK witness generation, and a CSK (secp256k1) for EIP-712 controller authorization.
In mnemonic mode both are deterministically derived from the seed and account index.
The base model does not require a bank/customer MPC share split or a bank co-signature on every transaction.
MPC or another institutional custody layer could be added later if the production threat model requires it.

## 2. Who holds what?

| Material / state | Prototype holder | Purpose |
|---|---|---|
| Test mnemonic | Backend environment only | Derives the test accounts |
| ESK | Derived inside the zkStables runtime | Decryption and ZK witness generation |
| CSK | Derived inside the zkStables runtime | EIP-712 controller authorization |
| ZK address | Public | Receiving encrypted transfers |
| Controller address | Public | Controller identity / public token operations |
| Internal ledger | Backend service | Available and reserved customer money |
| Bank/card event IDs | Backend service | Idempotency and operational processing |

For this exercise the backend therefore controls the test mnemonic. This is a demo setup, not a proposed production custody model.

## 3. Is real MPC the right tool here?

Not necessarily for this MVP.
zkStables already separates encryption/proving responsibilities from controller authorization.
The exercise does not require threshold signing.
MPC could become appropriate if production custody or recovery requirements demand that no single party controls signing material.
That decision should come from the threat model and custody requirements rather than using MPC by default.

## 4. Recovery

### Customer loses their phone

In this prototype the phone is not the key authority because the test account is controlled by the backend mnemonic.
A production mobile or linked-wallet design would need an explicit recovery and credential-rotation flow before launch.

### Employee leaves the company

An employee should not be the sole holder of the business account's root credentials.
Their service access or signing authority should be revoked and affected credentials rotated according to the production custody model.

### All credentials are lost while the account holds 400k

With pure mnemonic custody and no backup or recovery mechanism, losing all key material can make the funds unrecoverable.
A production system holding material customer funds therefore needs a defined backup/recovery or institutional custody design before launch.
There should not be an administrative reset that bypasses the cryptographic ownership model.

## 5. Cards need a decision in about one second. What is the authority and risk model?

Card authorization must not wait for a ZK proof or blockchain confirmation.
The internal ledger is the real-time authorization authority.
It checks available funds and reserves the authorized amount atomically.
The authorization ID provides idempotency so a retry does not reserve the money twice.
Settlement happens asynchronously and can have a different amount, arrive twice, or never arrive.
The service adjusts or releases the reserve during settlement.
Blockchain settlement and reconciliation happen outside the real-time card authorization path.
Production would also add spend limits, velocity controls and other card-risk rules.

## 6. Ledger vs chain: what if the chain succeeds and the service crashes before recording it?

The chain is authoritative for on-chain asset ownership; the internal ledger is authoritative for operational/card availability.
The service should persist transfer intent and an idempotency key before submitting a transaction.
After submission it should persist the transaction hash and track the operation as pending until confirmed.
If the service crashes, a reconciliation worker should query chain state/events and repair incomplete ledger records rather than blindly resending the transfer.
Reconciliation must itself be idempotent and should alert on unexplained differences.

## 7. Would you add yield?

Yes, but as an explicit opt-in product rather than silently applying yield to transactional balances.
Transactional money and yield balances should remain clearly separated.
Before launch I would make the yield source, liquidity constraints, smart-contract/counterparty risks and regulatory treatment explicit.
Customers should understand what happens to their funds when they opt in.

## 8. What AI mistake did you catch and correct?

The AI-generated integration initially risked treating the ledger's 2-decimal minor units as zkStables token base units.
I caught this by comparing the ledger representation (`42.50 = 4250`) with zkStables' 6-decimal token amounts before sending real transactions.
I added explicit conversion functions in both directions and verified balances after the testnet transactions.
That prevents a potentially serious 10,000x denomination error.
