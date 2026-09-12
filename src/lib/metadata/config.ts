/**
 * Storage Configuration
 *
 * Server-side configuration for decentralized storage providers.
 * API keys are NEVER exposed to the frontend.
 */

import type { StorageProviderConfig } from "@/types/metadata";

// Supported storage providers
export type StorageProvider = "pinata" | "web3.storage" | "nft.storage" | "local";

/**
 * Get storage provider configuration from environment variables
 */
export function getStorageConfig(provider: StorageProvider = "pinata"): StorageProviderConfig {
  switch (provider) {
    case "pinata":
      return {
        name: "Pinata",
        apiUrl: "https://api.pinata.cloud",
        gatewayUrl: "https://gateway.pinata.cloud/ipfs",
        apiKey: process.env.PINATA_API_KEY,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        pinningEnabled: true,
      };

    case "web3.storage":
      return {
        name: "Web3.Storage",
        apiUrl: "https://api.web3.storage",
        gatewayUrl: "https://w3s.link/ipfs",
        apiKey: process.env.WEB3_STORAGE_API_KEY,
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
        pinningEnabled: true,
      };

    case "nft.storage":
      return {
        name: "NFT.Storage",
        apiUrl: "https://api.nft.storage",
        gatewayUrl: "https://nftstorage.link/ipfs",
        apiKey: process.env.NFT_STORAGE_API_KEY,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        pinningEnabled: true,
      };

    case "local":
      return {
        name: "Local IPFS Node",
        apiUrl: process.env.IPFS_API_URL || "http://localhost:5001",
        gatewayUrl: process.env.IPFS_GATEWAY_URL || "http://localhost:8080/ipfs",
        maxFileSize: 100 * 1024 * 1024, // 100MB
        pinningEnabled: false,
      };

    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

/**
 * Get the default storage provider
 */
export function getDefaultProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER as StorageProvider) || "pinata";
}

/**
 * Validate that storage configuration is complete
 */
export function validateStorageConfig(provider: StorageProvider = "pinata"): {
  valid: boolean;
  missing: string[];
} {
  const config = getStorageConfig(provider);
  const missing: string[] = [];

  if (provider !== "local" && !config.apiKey) {
    missing.push(`${provider.toUpperCase()}_API_KEY`);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Environment variable documentation
 */
export const ENV_DOCS = `
# Decentralized Storage Configuration
# Add these to your .env.local file:

# Storage Provider: pinata | web3.storage | nft.storage | local
STORAGE_PROVIDER=pinata

# Pinata Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Web3.Storage Configuration (alternative)
WEB3_STORAGE_API_KEY=your_web3_storage_api_key

# NFT.Storage Configuration (alternative)
NFT_STORAGE_API_KEY=your_nft_storage_api_key

# Local IPFS Node Configuration (development)
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080/ipfs

# Gateway URLs for different providers
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
WEB3_STORAGE_GATEWAY=https://w3s.link/ipfs
NFT_STORAGE_GATEWAY=https://nftstorage.link/ipfs
`.trim();
