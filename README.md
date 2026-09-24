# zkStables Business

A backend-first prototype of a private crypto business account built for the Product Owner practical exercise.

The prototype combines encrypted zkStables transfers on Base Sepolia with an internal ledger for real-time banking operations such as incoming bank transfers and card authorization.

## Features

### zkStables / Base Sepolia

- Two independent business accounts
- EPK registration for both accounts
- Faucet funding
- Public-to-encrypted shielding
- Decrypted encrypted balance reporting
- Encrypted transfer from `business-a` to `business-b`
- Encrypted-to-public withdrawal to a plain EVM address
- Real testnet transaction hashes
- Mock and real blockchain modes

### Banking backend

- Internal ledger with available and reserved balances
- Idempotent incoming bank transfers
- Real-time card authorization
- Card reserves
- Idempotent authorization handling
- Card settlement, including settlement amounts different from authorization

### Frontend

- Business account overview
- Live encrypted zkUSD balance
- Encrypted transfer flow
- Card authorization demo
- Testnet activity view
- Responsive business banking dashboard

See [`TRANSACTIONS.md`](./TRANSACTIONS.md) for the real Base Sepolia transaction evidence.

See [`ANSWERS.md`](./ANSWERS.md) for the product and architecture questions from the exercise.

---

## Architecture

```text
Browser
   |
   v
Express API
   |
   +---- Internal Ledger
   |       |
   |       +-- bank transfer credits
   |       +-- available / reserved balance
   |       +-- card authorization
   |       +-- card settlement
   |
   +---- BlockchainService
           |
           +-- mock
           |
           +-- real
                |
                v
          zkStables SDK
                |
                v
           Base Sepolia
```

Zero-knowledge proving is performed on the backend rather than in the browser.

The blockchain represents on-chain asset ownership and encrypted balances.

The internal ledger represents the service's operational view of available and reserved customer money.

### Why card authorization is separate

Card authorization needs a real-time decision and therefore does not wait for ZK proof generation or blockchain confirmation.

For a `42.50` authorization, the service checks the internal ledger and, if sufficient funds are available, immediately reserves `42.50` and returns `APPROVED`.

Settlement is handled separately because it may arrive later, contain a different amount, arrive more than once, or never arrive.

---

## Money representation

Financial state uses integer values rather than JavaScript floating-point numbers.

The internal ledger uses two decimal places:

```text
42.50 = 4250
```

zkStables uses six-decimal token base units:

```text
42.50 zkUSD = 42,500,000 base units
```

Explicit conversion functions are used between the two representations.

This prevents floating-point and denomination errors.

---

## Testnet flow

The required Base Sepolia flow was completed successfully:

```text
Faucet
  |
  v
business-a public: 100 zkUSD
  |
  v
Public -> encrypted
  |
  v
business-a encrypted: 100 zkUSD
  |
  v
Encrypted transfer: 25 zkUSD
business-a -> business-b
  |
  v
business-a: 75 zkUSD
business-b: 25 zkUSD
  |
  v
Encrypted -> public: 10 zkUSD
business-b -> plain EVM address
```

After the required flow, the verified balances were:

- `business-a` encrypted: 75 zkUSD
- `business-b` encrypted: 15 zkUSD
- plain EVM recipient public: 10 zkUSD

An additional encrypted transfer was later executed through the frontend as an end-to-end UI/API test.

Transaction hashes and testnet addresses are recorded in [`TRANSACTIONS.md`](./TRANSACTIONS.md).

---

## Run locally

### Requirements

- Node.js 18+
- npm

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Mock mode works without a mnemonic.

For real Base Sepolia mode:

```text
PORT=3000
BLOCKCHAIN_MODE=real
ZKSTABLES_MNEMONIC=<test-only mnemonic>
```

Never commit mnemonics or private keys.

Start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Tests

Run:

```bash
npm test
npm run typecheck
```

The tests cover core ledger behavior including:

- duplicate incoming bank transfers
- duplicate card authorization
- insufficient funds
- card reserves
- duplicate settlement
- settlement amount differences

---

## Demo flow

1. Open the dashboard and show the encrypted zkUSD balance.
2. Send an encrypted transfer from `business-a` to `business-b`.
3. Show the returned Base Sepolia transaction hash.
4. Explain the distinction between the blockchain balance and internal ledger.
5. Simulate an incoming bank transfer to fund the ledger.
6. Trigger the `42.50` card authorization.
7. Show the immediate `APPROVED` decision and reserve.

---

## Key product decisions

**Internal ledger for card authorization**  
Card authorization must return quickly, so it does not wait for blockchain proving or confirmation.

**Blockchain and ledger have different responsibilities**  
The chain represents on-chain ownership. The ledger represents operational availability. Production requires reconciliation between them.

**Idempotency**  
Repeated bank-transfer, authorization, and settlement events must not move customer money twice.

**Integer money representation**  
Financial state uses integer minor units rather than JavaScript floating-point values.

**Backend proving**  
The frontend calls the API while zkStables proving and transaction submission happen on the backend.

**Test custody model**  
The local mnemonic is appropriate for this exercise but is not a proposed production custody architecture.

---

## Current limitations

This is intentionally a small testnet prototype.

- Ledger state, card authorizations, and idempotency records are stored in memory and are lost on restart.
- Production would require durable transactional storage.
- A durable blockchain-to-ledger reconciliation worker is not implemented.
- The real encrypted transfer flow is intentionally fixed to `business-a -> business-b`.
- The dashboard activity list represents the recorded demo flow rather than a live blockchain indexer.
- Authentication, user management, employee roles, and production access controls are outside the prototype scope.
- Mnemonic-based test accounts are not a proposed production custody architecture.
- Testnet only.

---

## Repository structure

```text
src/
├── api/                Express API
├── bank-transfers/     Incoming bank-transfer handling
├── blockchain/         Mock and real zkStables integration
├── cards/              Authorization and settlement
├── config/             Environment configuration
└── ledger/             Internal ledger and money representation

public/
├── index.html          Business dashboard
├── styles.css          Dashboard styling
└── app.js              Frontend API integration

tests/
├── bank-transfer.test.ts
└── cards.test.ts

ANSWERS.md              Product and architecture answers
TRANSACTIONS.md         Base Sepolia transaction evidence
.env.example            Environment template
```

## Security

`.env` is ignored by Git and remains local.

Do not commit mnemonics, private keys, API secrets, or production credentials.

All blockchain activity documented in this repository is testnet-only.
