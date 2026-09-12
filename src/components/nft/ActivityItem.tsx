"use client";

import Link from "next/link";
import {
  ArrowRightLeft,
  Tag,
  Sparkles,
  Send,
  Gavel,
  Handshake,
  Check,
  X,
  Play,
  StopCircle,
  ExternalLink,
} from "lucide-react";
import type { Activity, ActivityType } from "@/types";
import { cn, formatAddress, formatDate, formatNimiq } from "@/lib/utils";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { getExplorerTxUrl } from "@/types/activity";

interface ActivityItemProps {
  activity: Activity;
}

const activityIcons: Record<ActivityType, typeof ArrowRightLeft> = {
  sale: ArrowRightLeft,
  list: Tag,
  mint: Sparkles,
  transfer: Send,
  bid: Gavel,
  offer: Handshake,
  offer_accepted: Check,
  offer_cancelled: X,
  auction_started: Play,
  auction_ended: StopCircle,
};

const activityColors: Record<ActivityType, string> = {
  sale: "bg-primary/10 text-primary",
  list: "bg-accent/10 text-accent",
  mint: "bg-green-500/10 text-green-500",
  transfer: "bg-blue-500/10 text-blue-500",
  bid: "bg-yellow-500/10 text-yellow-500",
  offer: "bg-purple-500/10 text-purple-500",
  offer_accepted: "bg-green-500/10 text-green-500",
  offer_cancelled: "bg-red-500/10 text-red-500",
  auction_started: "bg-blue-500/10 text-blue-500",
  auction_ended: "bg-orange-500/10 text-orange-500",
};

const activityLabels: Record<ActivityType, string> = {
  sale: "Sale",
  list: "Listing",
  mint: "Mint",
  transfer: "Transfer",
  bid: "Bid",
  offer: "Offer",
  offer_accepted: "Offer Accepted",
  offer_cancelled: "Offer Cancelled",
  auction_started: "Auction Started",
  auction_ended: "Auction Ended",
};

export function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = activityIcons[activity.type];
  const colorClass = activityColors[activity.type];

  const renderUser = (user: Activity["from"] | Activity["to"], label?: string) => {
    if (!user) {
      return (
        <span className="font-medium text-text-muted">
          {label || "Unknown"}
        </span>
      );
    }

    return (
      <Link
        href={`/profile/${user.address}`}
        className="font-medium text-text hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {user.name || formatAddress(user.address)}
      </Link>
    );
  };

  const renderDescription = () => {
    const from = renderUser(activity.from, "System");
    const to = renderUser(activity.to);

    const nft = (
      <Link
        href={`/nft/${activity.nft.id}`}
        className="font-medium text-text hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {activity.nft.name}
      </Link>
    );

    switch (activity.type) {
      case "sale":
        return (
          <p className="text-sm text-text-secondary">
            {from} sold {nft} to {to}
          </p>
        );
      case "list":
        return (
          <p className="text-sm text-text-secondary">
            {from} listed {nft} for sale
          </p>
        );
      case "mint":
        return (
          <p className="text-sm text-text-secondary">
            {from} minted {nft}
          </p>
        );
      case "transfer":
        return (
          <p className="text-sm text-text-secondary">
            {from} transferred {nft} to {to}
          </p>
        );
      case "bid":
        return (
          <p className="text-sm text-text-secondary">
            {from} placed a bid on {nft}
          </p>
        );
      case "offer":
        return (
          <p className="text-sm text-text-secondary">
            {from} made an offer on {nft}
          </p>
        );
      case "offer_accepted":
        return (
          <p className="text-sm text-text-secondary">
            {from} accepted an offer on {nft} from {to}
          </p>
        );
      case "offer_cancelled":
        return (
          <p className="text-sm text-text-secondary">
            {from} cancelled their offer on {nft}
          </p>
        );
      case "auction_started":
        return (
          <p className="text-sm text-text-secondary">
            {from} started an auction for {nft}
          </p>
        );
      case "auction_ended":
        return (
          <p className="text-sm text-text-secondary">
            Auction for {nft} ended{to ? `, won by ${to}` : ""}
          </p>
        );
      default:
        return null;
    }
  };

  const explorerUrl = getExplorerTxUrl(activity.txHash);

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-surface-hover transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          colorClass
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        {renderDescription()}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-text-muted">
            {formatDate(activity.timestamp)}
          </span>

          <span
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              colorClass
            )}
          >
            {activityLabels[activity.type]}
          </span>

          {activity.price > 0 && (
            <PriceDisplay
              price={activity.price}
              currency={activity.currency || "NIM"}
              size="sm"
            />
          )}
        </div>
      </div>

      {activity.txHash && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="View on Nimiq Explorer"
        >
          <span className="hidden sm:inline">Tx</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export default ActivityItem;
