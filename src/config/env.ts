import "dotenv/config";

export type BlockchainMode = "mock" | "real";

export function getEnv() {
  const mode = (process.env.BLOCKCHAIN_MODE ?? "mock") as BlockchainMode;

  if (mode !== "mock" && mode !== "real") {
    throw new Error(`BLOCKCHAIN_MODE must be mock or real, got ${mode}`);
  }

  const mnemonic = process.env.ZKSTABLES_MNEMONIC;

  if (mode === "real" && !mnemonic) {
    throw new Error(
      "ZKSTABLES_MNEMONIC is required when BLOCKCHAIN_MODE=real",
    );
  }

  return {
    port: Number(process.env.PORT ?? 3000),
    blockchainMode: mode,
    zkstablesMnemonic: mnemonic,
    chainId: 84532 as const,
  };
}
