/**
 * Wallet configuration for different environments.
 */

export interface WalletConfig {
  hubUrl: string;
  appName: string;
  networkId: number;
  networkName: string;
  storeKey: string;
}

const configs: Record<string, WalletConfig> = {
  mainnet: {
    hubUrl: "https://hub.nimiq.com",
    appName: "NimiqNFT",
    networkId: 74,
    networkName: "Nimiq Mainnet",
    storeKey: "nimiq-nft-wallet",
  },
  testnet: {
    hubUrl: "https://hub.nimiq-testnet.com",
    appName: "NimiqNFT (Testnet)",
    networkId: 5,
    networkName: "Nimiq Testnet",
    storeKey: "nimiq-nft-wallet-testnet",
  },
};

export function getWalletConfig(
  network: "mainnet" | "testnet" = "mainnet",
): WalletConfig {
  return configs[network];
}

export const MARKETPLACE_CONFIG = {
  feePercent: 2.5,
  royaltyPercent: 2.5,
  marketplaceAddress: "NQ27 9CG2 XP33 N5NH 29EP 2YUS LMKV 3EM0 R4DJ",
  marketplaceName: "NimiqNFT",
} as const;
