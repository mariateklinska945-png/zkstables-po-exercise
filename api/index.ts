import { createApp } from "../src/api/server.js";
import { createBlockchainService } from "../src/blockchain/index.js";
import { getEnv } from "../src/config/env.js";
import { createDemoLedger } from "../src/ledger/ledger.js";

const env = getEnv();

const ledger = createDemoLedger();
const blockchain = createBlockchainService(env.blockchainMode);

const app = createApp(ledger, blockchain);

export default app;

