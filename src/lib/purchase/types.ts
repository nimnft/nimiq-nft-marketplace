/**
 * NFT Purchase Flow Types
 *
 * Defines the complete state machine and types for the NFT purchase flow.
 */

// ============================================================
// Purchase State Machine
// ============================================================

export type PurchaseStep =
  | "idle"
  | "checking-wallet"
  | "checking-listing"
  | "checking-ownership"
  | "fetching-price"
  | "calculating-fees"
  | "confirming"
  | "signing"
  | "pending"
  | "confirming-blockchain"
  | "verifying"
  | "indexing"
  | "success"
  | "error";

export type PurchaseErrorType =
  | "wallet-not-connected"
  | "wallet-rejected"
  | "listing-not-found"
  | "listing-expired"
  | "nft-already-sold"
  | "insufficient-balance"
  | "transaction-failed"
  | "network-error"
  | "indexing-delay"
  | "unknown";

// ============================================================
// Purchase Data Types
// ============================================================

export interface NftListingData {
  id: string;
  nftId: string;
  sellerAddress: string;
  sellerName?: string;
  price: number; // In Luna
  currency: "NIM";
  listedAt: string;
  expiresAt?: string;
  status: "active" | "sold" | "expired" | "cancelled";
}

export interface NftOwnershipData {
  id: string;
  ownerAddress: string;
  ownerName?: string;
  collectionId: string;
  lastTransferTx?: string;
}

export interface PurchaseFeeConfig {
  marketplaceFeePercent: number; // e.g., 2.5
  creatorRoyaltyPercent: number; // e.g., 5.0
}

export interface PurchaseFees {
  price: number; // In Luna
  marketplaceFee: number; // In Luna
  creatorRoyalty: number; // In Luna
  totalCost: number; // In Luna (price + fees)
  priceNim: number;
  marketplaceFeeNim: number;
  creatorRoyaltyNim: number;
  totalCostNim: number;
}

export interface PurchaseTransactionData {
  txHash: string;
  serializedTx: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number; // In Luna
  fee: number;
  blockNumber?: number;
  confirmations: number;
}

export interface PurchaseResult {
  success: boolean;
  nftId: string;
  buyerAddress: string;
  sellerAddress: string;
  transaction: PurchaseTransactionData;
  fees: PurchaseFees;
  completedAt: string;
}

// ============================================================
// Purchase Error
// ============================================================

export interface PurchaseError {
  type: PurchaseErrorType;
  message: string;
  details?: unknown;
  recoverable: boolean;
  retryAction?: () => void;
}

// ============================================================
// Purchase State
// ============================================================

export interface PurchaseState {
  step: PurchaseStep;
  nftId: string | null;
  listing: NftListingData | null;
  ownership: NftOwnershipData | null;
  fees: PurchaseFees | null;
  transaction: PurchaseTransactionData | null;
  error: PurchaseError | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================
// Purchase Actions
// ============================================================

export interface PurchaseActions {
  start: (nftId: string) => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => void;
  retry: () => Promise<void>;
  reset: () => void;
}

// ============================================================
// Hook Return Type
// ============================================================

export interface UsePurchaseReturn {
  state: PurchaseState;
  actions: PurchaseActions;
  isProcessing: boolean;
  canCancel: boolean;
}

// ============================================================
// Default Values
// ============================================================

export const DEFAULT_FEE_CONFIG: PurchaseFeeConfig = {
  marketplaceFeePercent: 2.5,
  creatorRoyaltyPercent: 5.0,
};

export const INITIAL_PURCHASE_STATE: PurchaseState = {
  step: "idle",
  nftId: null,
  listing: null,
  ownership: null,
  fees: null,
  transaction: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

// ============================================================
// Error Messages
// ============================================================

export const PURCHASE_ERROR_MESSAGES: Record<PurchaseErrorType, string> = {
  "wallet-not-connected": "Please connect your wallet to purchase NFTs.",
  "wallet-rejected": "You cancelled the transaction in your wallet.",
  "listing-not-found": "This listing no longer exists.",
  "listing-expired": "This listing has expired. The seller needs to re-list the NFT.",
  "nft-already-sold": "This NFT has already been sold to another buyer.",
  "insufficient-balance": "You don't have enough NIM to complete this purchase.",
  "transaction-failed": "The transaction failed. Please try again.",
  "network-error": "Network error. Please check your connection and try again.",
  "indexing-delay": "Transaction submitted but confirmation is taking longer than expected.",
  "unknown": "An unexpected error occurred. Please try again.",
};
