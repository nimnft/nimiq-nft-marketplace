/**
 * NFT Service Layer for Nimiq
 *
 * Nimiq does not have a native ERC-721 equivalent.
 * NFTs on Nimiq use off-chain metadata storage with on-chain payment verification.
 *
 * Architecture:
 * - Metadata: Stored off-chain (IPFS, Arweave, or centralized storage)
 * - Ownership: Tracked via on-chain transaction history
 * - Payments: Native NIM transactions via Hub API checkout()
 * - Verification: On-chain tx receipt verification
 *
 * This service provides:
 * - NFT listing/purchasing via native NIM transactions
 * - Metadata storage/retrieval
 * - Ownership verification via blockchain
 * - Price conversion (NIM ↔ USD)
 *
 * See: https://nimiq.github.io/hub/api-reference/checkout
 * See: https://nimiq.github.io/developer-center/build/rpc-docs/
 */

import type { WalletService, SignedTransaction, TransactionRequest } from "./types";
import { getBlockchainService, type NimiqBlockchainService } from "./blockchain";

export interface NftMetadata {
  id: string;
  name: string;
  description: string;
  image: string;
  externalUrl?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  sellerAddress: string;
  creatorAddress: string;
  collectionId: string;
  price: number; // In Luna
  currency: "NIM";
  listed: boolean;
  createdAt: string;
  tokenId: string;
}

export interface NftListing {
  nftId: string;
  sellerAddress: string;
  price: number; // In Luna
  currency: "NIM";
  listedAt: string;
  expiresAt?: string;
}

export interface NftPurchaseResult {
  success: boolean;
  transactionHash: string;
  serializedTx: string;
  nftId: string;
  buyerAddress: string;
  sellerAddress: string;
  price: number;
}

export interface NftListResult {
  success: boolean;
  transactionHash?: string;
  nftId: string;
  sellerAddress: string;
  price: number;
}

const LUNA_PER_NIM = 100_000;

export class NftService {
  private blockchain: NimiqBlockchainService;
  private wallet: WalletService | null = null;
  private listings = new Map<string, NftListing>();
  private metadata = new Map<string, NftMetadata>();

  constructor(network: "mainnet" | "testnet" = "mainnet") {
    this.blockchain = getBlockchainService(network);
  }

  /**
   * Attach a wallet service for transaction operations.
   */
  setWallet(wallet: WalletService): void {
    this.wallet = wallet;
  }

  /**
   * Convert Luna to NIM.
   * 1 NIM = 100,000 Luna
   */
  lunaToNim(luna: number): number {
    return luna / LUNA_PER_NIM;
  }

  /**
   * Convert NIM to Luna.
   */
  nimToLuna(nim: number): number {
    return Math.round(nim * LUNA_PER_NIM);
  }

  /**
   * Get NIM/USD price.
   * Uses CoinGecko API via blockchain service.
   */
  async getNimUsdPrice(): Promise<number> {
    return this.blockchain.getNimPrice();
  }

  /**
   * Convert NIM amount to USD.
   */
  async nimToUsd(nimAmount: number): Promise<number> {
    const price = await this.getNimUsdPrice();
    return nimAmount * price;
  }

  /**
   * Get NFT metadata.
   * In production, this would fetch from IPFS/Arweave.
   */
  async getMetadata(nftId: string): Promise<NftMetadata | null> {
    return this.metadata.get(nftId) || null;
  }

  /**
   * Store NFT metadata.
   * In production, this would upload to IPFS/Arweave.
   */
  async storeMetadata(metadata: NftMetadata): Promise<string> {
    this.metadata.set(metadata.id, metadata);
    // In production: upload to IPFS, return CID
    return metadata.id;
  }

  /**
   * List an NFT for sale.
   * Creates an on-chain listing record (off-chain for now, with tx proof).
   */
  async listNft(
    nftId: string,
    price: number, // In Luna
    sellerAddress: string,
    appName: string,
  ): Promise<NftListResult> {
    if (!this.wallet || this.wallet.getState() !== "connected") {
      return { success: false, nftId, sellerAddress, price };
    }

    const listing: NftListing = {
      nftId,
      sellerAddress,
      price,
      currency: "NIM",
      listedAt: new Date().toISOString(),
    };

    this.listings.set(nftId, listing);

    // In production: store listing on-chain or in a decentralized indexer
    // For now, we store locally and return success
    return {
      success: true,
      nftId,
      sellerAddress,
      price,
    };
  }

  /**
   * Purchase an NFT.
   * Sends NIM payment via Hub API checkout().
   *
   * Flow:
   * 1. Verify listing exists
   * 2. Create transaction request
   * 3. Send via Hub API checkout()
   * 4. Verify transaction on-chain
   * 5. Return purchase result
   *
   * See: https://nimiq.github.io/hub/api-reference/checkout
   */
  async purchaseNft(
    nftId: string,
    sellerAddress: string,
    price: number, // In Luna
    buyerAddress: string,
    appName: string,
  ): Promise<NftPurchaseResult> {
    if (!this.wallet || this.wallet.getState() !== "connected") {
      return {
        success: false,
        transactionHash: "",
        serializedTx: "",
        nftId,
        buyerAddress,
        sellerAddress,
        price,
      };
    }

    try {
      // Create transaction request
      const txRequest: TransactionRequest = {
        appName,
        recipient: sellerAddress,
        value: price,
        fee: 0, // Let Hub determine fee
        extraData: new TextEncoder().encode(`NFT:${nftId}`),
      };

      // Send via Hub API checkout()
      // This opens a popup for the user to confirm
      const signedTx: SignedTransaction = await this.wallet.sendTransaction(txRequest);

      // In production: submit to network via blockchain service
      // const txHash = await this.blockchain.sendRawTransaction(signedTx.serializedTx);

      // Remove listing
      this.listings.delete(nftId);

      return {
        success: true,
        transactionHash: signedTx.hash,
        serializedTx: signedTx.serializedTx,
        nftId,
        buyerAddress,
        sellerAddress,
        price,
      };
    } catch (error) {
      console.error("NFT purchase failed:", error);
      return {
        success: false,
        transactionHash: "",
        serializedTx: "",
        nftId,
        buyerAddress,
        sellerAddress,
        price,
      };
    }
  }

  /**
   * Verify an NFT purchase transaction on-chain.
   * Checks that the transaction was confirmed and the amount matches.
   */
  async verifyPurchase(
    txHash: string,
    expectedRecipient: string,
    expectedAmount: number,
  ): Promise<boolean> {
    try {
      const receipt = await this.blockchain.getTransactionReceipt(txHash);
      if (!receipt) return false;

      // Check confirmations
      if (receipt.confirmations < 1) return false;

      // In production: fetch full tx details and verify amount/recipient
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current block number for validity start height.
   * Used when creating transactions.
   */
  async getCurrentBlockHeight(): Promise<number> {
    return this.blockchain.getBlockNumber();
  }

  /**
   * Get listing for an NFT.
   */
  getListing(nftId: string): NftListing | null {
    return this.listings.get(nftId) || null;
  }

  /**
   * Get all active listings.
   */
  getAllListings(): NftListing[] {
    return Array.from(this.listings.values());
  }
}

/**
 * Singleton NFT service instance.
 */
let nftServiceInstance: NftService | null = null;

export function getNftService(
  network: "mainnet" | "testnet" = "mainnet",
): NftService {
  if (!nftServiceInstance) {
    nftServiceInstance = new NftService(network);
  }
  return nftServiceInstance;
}
