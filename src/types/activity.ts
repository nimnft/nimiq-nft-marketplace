/**
 * Activity Types
 *
 * Comprehensive types for the marketplace activity system.
 */

import type { ActivityType } from "@/types";

// ============================================================
// Activity Filter Types
// ============================================================

export type ActivityFilter = "all" | "sales" | "listings" | "transfers" | "mints" | "offers" | "auctions";

export const ACTIVITY_FILTER_MAP: Record<ActivityFilter, ActivityType[]> = {
  all: [
    "sale",
    "list",
    "mint",
    "transfer",
    "bid",
    "offer",
    "offer_accepted",
    "offer_cancelled",
    "auction_started",
    "auction_ended",
  ],
  sales: ["sale"],
  listings: ["list"],
  transfers: ["transfer"],
  mints: ["mint"],
  offers: ["offer", "offer_accepted", "offer_cancelled"],
  auctions: ["auction_started", "auction_ended", "bid"],
};

// ============================================================
// Activity Display Types
// ============================================================

export interface ActivityDisplayConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const ACTIVITY_DISPLAY_CONFIG: Record<ActivityType, ActivityDisplayConfig> = {
  sale: {
    label: "Sale",
    icon: "ArrowRightLeft",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  list: {
    label: "Listing",
    icon: "Tag",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  mint: {
    label: "Mint",
    icon: "Sparkles",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  transfer: {
    label: "Transfer",
    icon: "Send",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  bid: {
    label: "Bid",
    icon: "Gavel",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  offer: {
    label: "Offer",
    icon: "Handshake",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  offer_accepted: {
    label: "Offer Accepted",
    icon: "Check",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  offer_cancelled: {
    label: "Offer Cancelled",
    icon: "X",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  auction_started: {
    label: "Auction Started",
    icon: "Play",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  auction_ended: {
    label: "Auction Ended",
    icon: "StopCircle",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
};

// ============================================================
// Explorer URL Types
// ============================================================

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  txPath: string;
  addressPath: string;
  blockPath: string;
}

export const NIMIQ_EXPLORERS: ExplorerConfig[] = [
  {
    name: "Nimiq Scan",
    baseUrl: "https://nimiqscan.com",
    txPath: "/tx",
    addressPath: "/account",
    blockPath: "/block",
  },
  {
    name: "Nimiq Watch",
    baseUrl: "https://nimiqwatch.com",
    txPath: "/tx",
    addressPath: "/account",
    blockPath: "/block",
  },
];

/**
 * Get the best explorer URL for a transaction hash.
 * Returns null if no verified explorer is available.
 */
export function getExplorerTxUrl(txHash: string): string | null {
  if (!txHash) return null;
  // Use Nimiq Watch as the primary explorer
  return `${NIMIQ_EXPLORERS[0].baseUrl}${NIMIQ_EXPLORERS[0].txPath}/${txHash}`;
}

/**
 * Get the best explorer URL for an address.
 */
export function getExplorerAddressUrl(address: string): string | null {
  if (!address) return null;
  return `${NIMIQ_EXPLORERS[0].baseUrl}${NIMIQ_EXPLORERS[0].addressPath}/${address}`;
}

/**
 * Get the best explorer URL for a block.
 */
export function getExplorerBlockUrl(blockNumber: number): string | null {
  if (!blockNumber) return null;
  return `${NIMIQ_EXPLORERS[0].baseUrl}${NIMIQ_EXPLORERS[0].blockPath}/${blockNumber}`;
}
