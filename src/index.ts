import { startApi } from "./api/routes.js";
import { createBlockchainService } from "./blockchain/index.js";
import { getEnv } from "./config/env.js";
import { createDemoLedger } from "./ledger/ledger.js";

const env = getEnv();
const ledger = createDemoLedger();
const blockchain = createBlockchainService(env.blockchainMode);

startApi(ledger, blockchain, env.port);
