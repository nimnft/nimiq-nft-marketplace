"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart, Eye } from "lucide-react";
import type { NFT } from "@/types";
import { cn, formatAddress, generateGradient } from "@/lib/utils";
import { PriceDisplay } from "@/components/common/PriceDisplay";

interface NFTCardProps {
  nft: NFT;
  priority?: boolean;
}

export function NFTCard({ nft, priority = false }: NFTCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const gradient = generateGradient(nft.id);

  return (
    <Link
      href={`/nft/${nft.id}`}
      className="group block focus:outline-none"
      aria-label={`View ${nft.name}`}
    >
      <article className="nft-card rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-surface-hover">
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  "w-full h-full flex items-center justify-center text-2xl font-bold text-white/50",
                  gradient
                )}
              >
                {nft.name[0]}
              </div>
            </div>
          ) : (
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              onError={() => setImageError(true)}
            />
          )}

          {nft.listed && (
            <span className="absolute top-3 left-3 badge badge-primary">
              Listed
            </span>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="p-2 bg-surface/80 backdrop-blur-sm rounded-full hover:bg-surface transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-colors",
                  isLiked ? "fill-danger text-danger" : "text-text-secondary"
                )}
              />
            </button>
            <button
              className="p-2 bg-surface/80 backdrop-blur-sm rounded-full hover:bg-surface transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label="Quick view"
            >
              <Eye className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white",
                gradient
              )}
              aria-hidden="true"
            >
              {nft.owner.name?.[0] || formatAddress(nft.owner.address).slice(2, 4)}
            </div>
            <span className="text-sm text-text-secondary truncate">
              {nft.collection.name}
            </span>
          </div>

          <h3 className="font-semibold text-text truncate mb-3 group-hover:text-primary transition-colors">
            {nft.name}
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Price</p>
              <PriceDisplay price={nft.price} currency={nft.currency} />
            </div>

            {nft.lastSalePrice && (
              <div className="text-right">
                <p className="text-xs text-text-muted mb-0.5">Last Sale</p>
                <PriceDisplay
                  price={nft.lastSalePrice}
                  currency={nft.currency}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
