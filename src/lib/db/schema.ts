/**
 * Database Schema for NimiqNFT
 *
 * This schema defines the off-chain data model.
 * The blockchain remains the source of truth for ownership and transactions.
 *
 * Tables:
 * - users: Wallet-linked user profiles
 * - collections: NFT collections
 * - nfts: Individual NFT tokens
 * - listings: Active/expired marketplace listings
 * - sales: Completed sales records
 * - offers: Purchase offers on NFTs
 * - auctions: Auction records (off-chain bids)
 * - activity: All marketplace activity events
 * - favorites: User favorites/bookmarks
 * - signed_messages: Signed authorizations from wallets
 * - blockchain_index: Last indexed block number
 */

export interface User {
  id: string;
  address: string; // Nimiq address (unique)
  name: string;
  avatar: string;
  bio: string;
  website?: string;
  twitter?: string;
  discord?: string;
  joinedAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  description: string;
  image: string; // IPFS URI
  bannerImage: string; // IPFS URI
  creatorAddress: string; // Nimiq address
  creatorId: string; // References users.id
  royaltyPercent: number; // 0-10
  maxSupply?: number; // null = unlimited
  category: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed statistics (updated by indexer)
  totalItems: number;
  ownersCount: number;
  floorPrice: number; // In Luna
  totalVolume: number; // In Luna
}

export interface Nft {
  id: string;
  tokenId: string; // Sequential per collection
  name: string;
  description: string;
  image: string; // IPFS URI
  externalUrl?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  // Ownership
  ownerAddress: string; // Current owner's Nimiq address
  ownerId: string; // References users.id
  creatorAddress: string; // Original creator's Nimiq address
  creatorId: string; // References users.id
  // Collection
  collectionId: string; // References collections.id
  // Chain reference
  mintTxHash: string; // On-chain transaction hash
  lastTransferTx?: string; // Last transfer tx hash
  // Economics
  royaltyPercent: number; // 0-10, default from collection
  price?: number; // In Luna, only if listed
  listed: boolean;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  mintedAt: string;
}

export type SaleType = "fixed" | "auction";
export type ListingStatus = "active" | "sold" | "expired" | "cancelled";

export interface Listing {
  id: string;
  nftId: string; // References nfts.id
  sellerAddress: string; // Nimiq address
  sellerId: string; // References users.id
  // Pricing
  saleType: SaleType;
  price: number; // In Luna, for fixed price
  startPrice?: number; // In Luna, for auction
  reservePrice?: number; // In Luna, for auction
  currentBid?: number; // In Luna, for auction
  currentBidder?: string; // Nimiq address
  currentBidderId?: string; // References users.id
  // Duration
  startsAt: string;
  expiresAt: string;
  // Status
  status: ListingStatus;
  // Chain reference
  listTxHash?: string; // Commitment tx hash
  saleTxHash?: string; // Payment tx hash
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export type TxType = "mint" | "sale" | "transfer" | "list" | "offer" | "bid" | "royalty" | "fee";

export interface Sale {
  id: string;
  nftId: string; // References nfts.id
  listingId: string; // References listings.id
  // Parties
  buyerAddress: string; // Nimiq address
  buyerId: string; // References users.id
  sellerAddress: string; // Nimiq address
  sellerId: string; // References users.id
  // Economics
  price: number; // In Luna
  marketplaceFee: number; // In Luna
  creatorRoyalty: number; // In Luna
  // Chain reference
  txHash: string; // On-chain transaction hash
  blockNumber: number;
  confirmed: boolean;
  // Timestamps
  soldAt: string;
  createdAt: string;
}

export type OfferStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled";

export interface Offer {
  id: string;
  nftId: string; // References nfts.id
  // Parties
  buyerAddress: string; // Nimiq address
  buyerId: string; // References users.id
  sellerAddress: string; // Nimiq address
  sellerId: string; // References users.id
  // Economics
  amount: number; // In Luna
  // Status
  status: OfferStatus;
  // Duration
  expiresAt: string;
  // Message
  message?: string; // Optional note to seller
  // Chain reference
  offerTxHash?: string; // Signed message proof
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export type AuctionStatus = "pending" | "active" | "ended" | "cancelled";

export interface Auction {
  id: string;
  nftId: string; // References nfts.id
  sellerAddress: string;
  sellerId: string;
  // Pricing
  startPrice: number; // In Luna
  reservePrice: number; // In Luna
  currentBid?: number; // In Luna
  currentBidder?: string; // Nimiq address
  currentBidderId?: string;
  // Duration
  startsAt: string;
  expiresAt: string;
  // Status
  status: AuctionStatus;
  // Result
  winnerAddress?: string;
  winnerId?: string;
  finalPrice?: number;
  // Chain reference
  auctionTxHash?: string; // Signed message proof
  saleTxHash?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "mint"
  | "sale"
  | "list"
  | "unlist"
  | "transfer"
  | "bid"
  | "offer"
  | "offer_accepted"
  | "offer_rejected"
  | "auction_created"
  | "auction_bid"
  | "auction_won"
  | "favorite";

export interface Activity {
  id: string;
  type: ActivityType;
  nftId?: string;
  collectionId?: string;
  userAddress: string; // Who performed the action
  userId: string;
  fromAddress?: string;
  toAddress?: string;
  price?: number; // In Luna
  txHash?: string;
  blockNumber?: number;
  metadata?: Record<string, unknown>; // Additional event data
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  nftId: string;
  createdAt: string;
}

export interface SignedMessage {
  id: string;
  address: string; // Signer's Nimiq address
  message: string; // The signed message content
  signature: string; // Hex-encoded signature
  publicKey: string; // Hex-encoded public key
 用途: string; // Purpose: "sale", "bid", "transfer", etc.
  used: boolean; // Whether this message has been consumed
  nonce: string; // Unique nonce
  expiresAt: string;
  createdAt: string;
}

export interface BlockchainIndex {
  id: string;
  lastIndexedBlock: number;
  lastIndexedAt: string;
  indexerVersion: string;
  errors?: string; // Last error if any
}

// Query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface NftFilterParams extends PaginationParams {
  collectionId?: string;
  ownerAddress?: string;
  creatorAddress?: string;
  minPrice?: number;
  maxPrice?: number;
  listed?: boolean;
  search?: string;
  attributes?: Record<string, string | number>;
}

export interface CollectionFilterParams extends PaginationParams {
  category?: string;
  featured?: boolean;
  creatorAddress?: string;
  search?: string;
}

export interface ActivityFilterParams extends PaginationParams {
  nftId?: string;
  collectionId?: string;
  userAddress?: string;
  type?: ActivityType;
  from?: string; // ISO date
  to?: string; // ISO date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Statistics types
export interface MarketplaceStats {
  totalNfts: number;
  totalCollections: number;
  totalUsers: number;
  totalSales: number;
  totalVolume: number; // In Luna
  floorPrice: number; // In Luna
  averageSalePrice: number; // In Luna
  activeListings: number;
  activeAuctions: number;
}

export interface CollectionStats {
  collectionId: string;
  totalItems: number;
  ownersCount: number;
  floorPrice: number;
  totalVolume: number;
  averagePrice: number;
  highestSale: number;
  activeListings: number;
}

export interface UserStats {
  userId: string;
  totalOwned: number;
  totalCreated: number;
  totalSold: number;
  totalBought: number;
  totalVolume: number;
  totalEarnings: number;
}
