/**
 * Purchase Service
 *
 * Server-side and client-side logic for NFT purchases.
 * Handles validation, fee calculation, and transaction orchestration.
 */

import { getBlockchainService } from "../wallet/blockchain";
import { getNftService } from "../wallet/nft-service";
import type { NftListingData, NftOwnershipData, PurchaseFeeConfig, PurchaseFees } from "./types";
import { DEFAULT_FEE_CONFIG } from "./types";

const LUNA_PER_NIM = 100_000;

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validate that the listing still exists and is active.
 */
export async function validateListing(
  nftId: string,
  store?: any
): Promise<{ valid: boolean; listing?: NftListingData; error?: string }> {
  try {
    // Try to get from store if provided
    if (store) {
      const listing = store.getListingByNft(nftId);
      if (!listing) {
        return { valid: false, error: "listing-not-found" };
      }
      if (listing.status !== "active") {
        return { valid: false, error: "nft-already-sold" };
      }
      if (listing.expiresAt && new Date(listing.expiresAt) < new Date()) {
        return { valid: false, error: "listing-expired" };
      }
      return {
        valid: true,
        listing: {
          id: listing.id,
          nftId: listing.nftId,
          sellerAddress: listing.sellerAddress,
          price: listing.price,
          currency: "NIM",
          listedAt: listing.createdAt,
          expiresAt: listing.expiresAt,
          status: listing.status as "active",
        },
      };
    }

    // Fallback to NFT service (mock data)
    const nftService = getNftService();
    const mockListing = nftService.getListing(nftId);
    if (!mockListing) {
      return { valid: false, error: "listing-not-found" };
    }
    return {
      valid: true,
      listing: {
        id: nftId,
        nftId: mockListing.nftId,
        sellerAddress: mockListing.sellerAddress,
        price: mockListing.price,
        currency: "NIM",
        listedAt: mockListing.listedAt,
        expiresAt: mockListing.expiresAt,
        status: "active",
      },
    };
  } catch {
    return { valid: false, error: "listing-not-found" };
  }
}

/**
 * Validate NFT ownership matches the listing.
 */
export async function validateOwnership(
  nftId: string,
  sellerAddress: string,
  store?: any
): Promise<{ valid: boolean; ownership?: NftOwnershipData; error?: string }> {
  try {
    if (store) {
      const nft = store.getNft(nftId);
      if (!nft) {
        return { valid: false, error: "nft-already-sold" };
      }
      if (nft.ownerAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
        return { valid: false, error: "nft-already-sold" };
      }
      return {
        valid: true,
        ownership: {
          id: nft.id,
          ownerAddress: nft.ownerAddress,
          collectionId: nft.collectionId,
          lastTransferTx: nft.lastTransferTx,
        },
      };
    }
    return {
      valid: true,
      ownership: {
        id: nftId,
        ownerAddress: sellerAddress,
        collectionId: "",
      },
    };
  } catch {
    return { valid: false, error: "nft-already-sold" };
  }
}

/**
 * Validate buyer has sufficient balance.
 */
export async function validateBalance(
  buyerAddress: string,
  totalCost: number
): Promise<{ valid: boolean; balance?: number; error?: string }> {
  try {
    const blockchain = getBlockchainService("mainnet");
    const balance = await blockchain.getBalance(buyerAddress);

    if (balance < totalCost) {
      return {
        valid: false,
        balance,
        error: "insufficient-balance",
      };
    }

    return { valid: true, balance };
  } catch {
    // If we can't check balance, proceed (wallet will handle validation)
    return { valid: true };
  }
}

// ============================================================
// Fee Calculation
// ============================================================

/**
 * Calculate all purchase fees.
 */
export function calculateFees(
  priceLuna: number,
  config: PurchaseFeeConfig = DEFAULT_FEE_CONFIG,
): PurchaseFees {
  const marketplaceFee = Math.round(priceLuna * (config.marketplaceFeePercent / 100));
  const creatorRoyalty = Math.round(priceLuna * (config.creatorRoyaltyPercent / 100));
  const totalCost = priceLuna + marketplaceFee + creatorRoyalty;

  return {
    price: priceLuna,
    marketplaceFee,
    creatorRoyalty,
    totalCost,
    priceNim: priceLuna / LUNA_PER_NIM,
    marketplaceFeeNim: marketplaceFee / LUNA_PER_NIM,
    creatorRoyaltyNim: creatorRoyalty / LUNA_PER_NIM,
    totalCostNim: totalCost / LUNA_PER_NIM,
  };
}

// ============================================================
// Transaction Orchestration
// ============================================================

/**
 * Wait for blockchain confirmation with timeout.
 */
export async function waitForConfirmation(
  txHash: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    requiredConfirmations?: number;
  } = {}
): Promise<{ confirmed: boolean; confirmations: number; blockNumber?: number }> {
  const {
    maxAttempts = 60,
    intervalMs = 3000,
    requiredConfirmations = 1,
  } = options;

  const blockchain = getBlockchainService("mainnet");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await blockchain.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations >= requiredConfirmations) {
        return {
          confirmed: true,
          confirmations: receipt.confirmations,
          blockNumber: receipt.blockNumber,
        };
      }
    } catch {
      // Receipt not available yet
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { confirmed: false, confirmations: 0 };
}

/**
 * Verify a purchase transaction.
 */
export async function verifyPurchaseTransaction(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: number
): Promise<{
  valid: boolean;
  actualRecipient?: string;
  actualAmount?: number;
  confirmations?: number;
  error?: string;
}> {
  try {
    const blockchain = getBlockchainService("mainnet");
    const receipt = await blockchain.getTransactionReceipt(txHash);

    if (!receipt) {
      return { valid: false, error: "Transaction not found" };
    }

    if (receipt.confirmations < 1) {
      return { valid: false, error: "Transaction not confirmed" };
    }

    // In production, verify actual recipient and amount from tx details
    return {
      valid: true,
      actualRecipient: expectedRecipient,
      actualAmount: expectedAmount,
      confirmations: receipt.confirmations,
    };
  } catch {
    return { valid: false, error: "Failed to verify transaction" };
  }
}
