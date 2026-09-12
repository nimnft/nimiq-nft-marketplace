"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { TrendingUp, Users, Layers } from "lucide-react";
import type { Collection } from "@/types";
import { cn, formatAddress, generateGradient } from "@/lib/utils";
import { PriceDisplay } from "@/components/common/PriceDisplay";

interface CollectionCardProps {
  collection: Collection;
  priority?: boolean;
}

export function CollectionCard({ collection, priority = false }: CollectionCardProps) {
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const gradient = generateGradient(collection.id);

  return (
    <Link
      href={`/collection/${collection.slug}`}
      className="group block focus:outline-none"
      aria-label={`View ${collection.name} collection`}
    >
      <article className="nft-card rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="relative h-32 overflow-hidden bg-surface-hover">
          {bannerError || !collection.bannerImage ? (
            <div
              className={cn(
                "w-full h-full transition-transform duration-300 group-hover:scale-105",
                gradient
              )}
            />
          ) : (
            <Image
              src={collection.bannerImage}
              alt={`${collection.name} banner`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              onError={() => setBannerError(true)}
            />
          )}

          {collection.featured && (
            <span className="absolute top-3 left-3 badge badge-primary">
              Featured
            </span>
          )}

          <div className="absolute -bottom-6 left-4">
            <div className="relative w-14 h-14 rounded-xl border-4 border-surface overflow-hidden bg-surface">
              {logoError || !collection.image ? (
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center text-lg font-bold text-white",
                    gradient
                  )}
                >
                  {collection.name[0]}
                </div>
              ) : (
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-4 pt-8">
          <h3 className="font-semibold text-text truncate mb-1 group-hover:text-primary transition-colors">
            {collection.name}
          </h3>
          <p className="text-sm text-text-secondary truncate mb-4">
            by {collection.creator.name || formatAddress(collection.creator.address)}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Floor</p>
                <PriceDisplay
                  price={collection.floorPrice}
                  currency="NIM"
                  size="sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Items</p>
                <p className="text-sm font-medium text-text truncate">
                  {collection.totalItems.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Volume</p>
                <p className="text-sm font-medium text-text truncate">
                  {collection.totalVolume.toLocaleString()} NIM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Owners</p>
                <p className="text-sm font-medium text-text truncate">
                  {collection.ownersCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
