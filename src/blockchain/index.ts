import type { BlockchainMode } from "../config/env.js";
import { MockBlockchainService } from "./mock.js";
import { RealBlockchainService } from "./real.js";
import type { BlockchainService } from "./types.js";

export function createBlockchainService(mode: BlockchainMode): BlockchainService {
  if (mode === "real") return new RealBlockchainService();
  return new MockBlockchainService();
}

export type { BlockchainService } from "./types.js";
