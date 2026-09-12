export interface User {
  address: string;
  name: string;
  avatar: string;
  bio: string;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  nftCount: number;
  collectionCount: number;
}

export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  owner: User;
  creator: User;
  collection: Collection;
  tokenId: string;
  contractAddress: string;
  traits: Trait[];
  listed: boolean;
  createdAt: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage: string;
  creator: User;
  floorPrice: number;
  totalVolume: number;
  totalItems: number;
  ownersCount: number;
  createdAt: string;
  category: string;
  featured: boolean;
}

export interface Trait {
  type: string;
  value: string;
  rarity: number;
}

export type ActivityType =
  | "sale"
  | "list"
  | "mint"
  | "transfer"
  | "bid"
  | "offer"
  | "offer_accepted"
  | "offer_cancelled"
  | "auction_started"
  | "auction_ended";

export interface Activity {
  id: string;
  type: ActivityType;
  nft: NFT;
  from?: User;
  to?: User;
  price: number;
  currency: string;
  timestamp: string;
  txHash: string;
  collection?: Collection;
  auctionId?: string;
  offerId?: string;
}

export type SortOption = "recent" | "price_asc" | "price_desc" | "popular" | "newest" | "volume";
export type FilterCategory = "all" | "art" | "photography" | "gaming" | "collectibles" | "music";

export interface FilterState {
  category: FilterCategory;
  sort: SortOption;
  priceRange: [number, number];
  searchQuery: string;
}

// Re-export metadata types
export * from "./metadata";

// Re-export activity types
export * from "./activity";
