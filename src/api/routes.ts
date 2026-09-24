import { createApp } from "./server.js";
import type { BlockchainService } from "../blockchain/types.js";
import type { Ledger } from "../ledger/ledger.js";

export function startApi(ledger: Ledger, blockchain: BlockchainService, port: number) {
  const app = createApp(ledger, blockchain);
  return app.listen(port, () => {
    console.log(`API listening on http://localhost:${port} (blockchain=${blockchain.mode})`);
  });
}
