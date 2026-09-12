"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Heart, Search, X, ChevronDown, BadgeCheck, Flame,
  TrendingUp, Users, Layers, ExternalLink, Copy, Check,
  ArrowRightLeft, Tag, Sparkles, Send, Gavel, Handshake, Clock,
  PackageOpen, RotateCcw, Globe, Shield
} from "lucide-react";
import { mockCollections } from "@/lib/mock-users";
import { mockNFTs, mockActivities } from "@/lib/mock-nfts";
import { fetchNFTs, fetchActivity } from "@/lib/user-store";
import { cn, formatAddress, generateGradient, formatDate, formatNimiq } from "@/lib/utils";
import type { NFT, Activity } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type TabId = "nfts" | "activity" | "owners";
type SortOption = "recent" | "price_asc" | "price_desc" | "newest";
type FilterOption = "all" | "listed" | "unlisted";

function getActivityIcon(type: Activity["type"]) {
  switch (type) {
    case "sale": return ArrowRightLeft;
    case "list": return Tag;
    case "mint": return Sparkles;
    case "transfer": return Send;
    case "bid": return Gavel;
    case "offer": return Handshake;
    default: return Clock;
  }
}

function getActivityColor(type: Activity["type"]) {
  switch (type) {
    case "sale": return "text-success";
    case "list": return "text-primary";
    case "mint": return "text-accent";
    case "transfer": return "text-warning";
    case "bid": return "text-danger";
    case "offer": return "text-primary";
    default: return "text-text-muted";
  }
}

function getActivityText(activity: Activity): string {
  const fromName = activity.from?.name || formatAddress(activity.from?.address || "");
  const toName = activity.to?.name || formatAddress(activity.to?.address || "");
  switch (activity.type) {
    case "sale": return `${fromName} sold to ${toName}`;
    case "list": return `${fromName} listed`;
    case "mint": return `${fromName} minted`;
    case "transfer": return `${fromName} transferred to ${toName}`;
    case "bid": return `${fromName} bid`;
    case "offer": return `${fromName} offered`;
    default: return "Unknown activity";
  }
}

export default function CollectionDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const collection = mockCollections.find((c) => c.slug === slug);

  const [activeTab, setActiveTab] = useState<TabId>("nfts");
  const [nftSort, setNftSort] = useState<SortOption>("recent");
  const [nftFilter, setNftFilter] = useState<FilterOption>("all");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [apiNFTs, setApiNFTs] = useState<any[]>([]);
  const [apiActivities, setApiActivities] = useState<any[]>([]);
  useEffect(() => { fetchNFTs().then(setApiNFTs).catch(() => {}); fetchActivity().then(setApiActivities).catch(() => {}); }, []);

  const toggleFavorite = useCallback((nftId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(nftId)) next.delete(nftId);
      else next.add(nftId);
      return next;
    });
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }, []);

  const collectionNFTs = useMemo(() => {
    if (!collection) return [];
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const allNFTs = [...apiNFTs, ...mockNFTs.filter((n: any) => !apiIds.has(n.id))];
    let filtered = allNFTs.filter((n) => n.collection.id === collection.id);
    if (nftFilter === "listed") filtered = filtered.filter((n) => n.listed);
    if (nftFilter === "unlisted") filtered = filtered.filter((n) => !n.listed);
    switch (nftSort) {
      case "price_asc": return [...filtered].sort((a, b) => a.price - b.price);
      case "price_desc": return [...filtered].sort((a, b) => b.price - a.price);
      case "newest": return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "recent":
      default: return filtered;
    }
  }, [collection, nftSort, nftFilter, apiNFTs]);

  const collectionActivities = useMemo(() => {
    if (!collection) return [];
    const allActs = [...apiActivities, ...mockActivities];
    return allActs.filter((a) => a.nft.collection.id === collection.id);
  }, [collection, apiActivities]);

  const collectionOwners = useMemo(() => {
    if (!collection) return [];
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const allNFTs = [...apiNFTs, ...mockNFTs.filter((n: any) => !apiIds.has(n.id))];
    const nftsInCollection = allNFTs.filter((n) => n.collection.id === collection.id);
    const ownerMap = new Map<string, { owner: NFT["owner"]; count: number }>();
    for (const nft of nftsInCollection) {
      const existing = ownerMap.get(nft.owner.address);
      if (existing) {
        existing.count++;
      } else {
        ownerMap.set(nft.owner.address, { owner: nft.owner, count: 1 });
      }
    }
    return Array.from(ownerMap.values()).sort((a, b) => b.count - a.count);
  }, [collection, apiNFTs]);

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
            <PackageOpen className="w-10 h-10 text-text-muted" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Collection not found</h1>
          <p className="text-text-secondary mb-8">
            The collection you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-text font-medium hover:bg-primary-hover transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  const bannerHue1 = (collection.id.charCodeAt(4) * 7) % 360;
  const bannerHue2 = (bannerHue1 + 50) % 360;
  const bannerGradient = `linear-gradient(135deg, hsl(${bannerHue1}, 60%, 45%), hsl(${bannerHue2}, 70%, 50%))`;
  const avatarGradient = generateGradient(collection.id);

  const sortLabels: Record<SortOption, string> = {
    recent: "Recently Listed",
    price_asc: "Price Low-High",
    price_desc: "Price High-Low",
    newest: "Newest",
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "nfts", label: "NFTs", count: collectionNFTs.length },
    { id: "activity", label: "Activity", count: collectionActivities.length },
    { id: "owners", label: "Owners", count: collectionOwners.length },
  ];

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div
        className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden"
        style={{ background: bannerGradient }}
      >
        {collection.bannerImage ? (
          <Image
            src={collection.bannerImage}
            alt={collection.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/80 backdrop-blur-sm border border-border text-text-secondary hover:text-text hover:bg-surface transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Collections
          </Link>
        </div>
      </div>

      {/* Collection Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-10 animate-fade-in">
          {/* Avatar */}
          <div className="relative w-28 h-28 rounded-2xl border-4 border-surface overflow-hidden bg-surface shrink-0 shadow-lg">
            {collection.image ? (
              <Image
                src={collection.image}
                alt={collection.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                style={{ background: avatarGradient }}
              >
                {collection.name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-text truncate">{collection.name}</h1>
              <BadgeCheck className="w-6 h-6 text-primary shrink-0" />
            </div>
            <p className="text-text-secondary mb-2">
              by{" "}
              <Link
                href={`/profile/${collection.creator.address}`}
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                {collection.creator.name || formatAddress(collection.creator.address)}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </p>
            <p className="text-sm text-text-muted max-w-xl mb-3">{collection.description}</p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => copyToClipboard(collection.creator.address)}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {copiedAddress ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {formatAddress(collection.creator.address)}
              </button>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Globe className="w-3 h-3" />
                nimiq.com
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Verified
              </span>
              <span className="text-xs text-text-muted">
                Created {formatDate(collection.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 animate-slide-up">
          <div className="rounded-xl bg-surface border border-border p-4">
            <TrendingUp className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-text-muted mb-1">Floor Price</p>
            <p className="text-lg font-bold text-text">{formatNimiq(collection.floorPrice)} NIM</p>
          </div>
          <div className="rounded-xl bg-surface border border-border p-4">
            <TrendingUp className="w-5 h-5 text-accent mb-2" />
            <p className="text-xs text-text-muted mb-1">Total Volume</p>
            <p className="text-lg font-bold text-text">{formatNimiq(collection.totalVolume)} NIM</p>
          </div>
          <div className="rounded-xl bg-surface border border-border p-4">
            <Layers className="w-5 h-5 text-text-secondary mb-2" />
            <p className="text-xs text-text-muted mb-1">Items</p>
            <p className="text-lg font-bold text-text">{collection.totalItems.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-surface border border-border p-4">
            <Users className="w-5 h-5 text-text-secondary mb-2" />
            <p className="text-xs text-text-muted mb-1">Owners</p>
            <p className="text-lg font-bold text-text">{collection.ownersCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-3 text-sm font-medium border-b-2 transition-colors relative",
                  activeTab === tab.id
                    ? "border-primary text-text"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                {tab.label}
                <span className={cn(
                  "ml-2 text-xs px-2 py-0.5 rounded-full",
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary"
                    : "bg-surface text-text-muted"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* NFTs Tab */}
        {activeTab === "nfts" && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Filter buttons */}
              <div className="flex gap-2">
                {(["all", "listed", "unlisted"] as FilterOption[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setNftFilter(filter)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                      nftFilter === filter
                        ? "bg-primary text-primary-text"
                        : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-hover"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  {sortLabels[nftSort]}
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sortDropdownOpen && "rotate-180")} />
                </button>
                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-lg z-20 py-1 animate-fade-in">
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setNftSort(value); setSortDropdownOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm transition-colors",
                          nftSort === value
                            ? "text-primary bg-primary/10"
                            : "text-text-secondary hover:bg-surface-hover"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {collectionNFTs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {collectionNFTs.map((nft, index) => (
                  <Link
                    key={nft.id}
                    href={`/nft/${nft.id}`}
                    className="group nft-card-hover animate-fade-in rounded-2xl bg-surface border border-border overflow-hidden"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={nft.image}
                        alt={nft.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Listed badge */}
                      {nft.listed && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-lg bg-success/90 text-white text-xs font-semibold backdrop-blur-sm">
                            Listed
                          </span>
                        </div>
                      )}

                      {/* Favorite button */}
                      <button
                        onClick={(e) => toggleFavorite(nft.id, e)}
                        className={cn(
                          "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all",
                          favorites.has(nft.id)
                            ? "bg-danger/90 text-white"
                            : "bg-black/30 text-white/80 hover:bg-danger/70 hover:text-white"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", favorites.has(nft.id) && "fill-current")} />
                      </button>

                      {/* Buy button on hover */}
                      {nft.listed && (
                        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Link
                            href={`/nft/${nft.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full py-2.5 rounded-xl bg-primary text-primary-text font-semibold text-sm hover:bg-primary-hover transition-colors text-center block"
                          >
                            Buy Now
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-5 h-5 rounded-full shrink-0"
                          style={{ background: generateGradient(nft.creator.address) }}
                        />
                        <span className="text-xs text-text-muted truncate">
                          {nft.collection.name}
                        </span>
                      </div>
                      <h3 className="font-semibold text-text group-hover:text-primary transition-colors truncate mb-2">
                        {nft.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-text-muted">Price</p>
                          <p className="text-sm font-bold text-text">
                            {formatNimiq(nft.price)} NIM
                          </p>
                        </div>
                        {nft.lastSalePrice && (
                          <div className="text-right">
                            <p className="text-xs text-text-muted">Last Sale</p>
                            <p className="text-xs text-text-secondary">
                              {formatNimiq(nft.lastSalePrice)} NIM
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-muted mb-4">
                  {nftFilter === "all"
                    ? "No NFTs in this collection yet"
                    : `No ${nftFilter} NFTs in this collection`}
                </p>
                {(nftFilter !== "all" || nftSort !== "recent") && (
                  <button
                    onClick={() => { setNftFilter("all"); setNftSort("recent"); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm text-text-secondary hover:text-text transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="animate-fade-in">
            {collectionActivities.length > 0 ? (
              <div className="space-y-3">
                {collectionActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  const iconColor = getActivityColor(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className={cn("w-10 h-10 rounded-xl bg-bg flex items-center justify-center shrink-0", iconColor)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text truncate">
                          {getActivityText(activity)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Link
                            href={`/nft/${activity.nft.id}`}
                            className="text-xs text-primary hover:underline truncate"
                          >
                            {activity.nft.name}
                          </Link>
                          <span className="text-xs text-text-muted">•</span>
                          <span className="text-xs text-text-muted">{formatDate(activity.timestamp)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {activity.price > 0 && (
                          <p className="text-sm font-semibold text-text">
                            {formatNimiq(activity.price)} NIM
                          </p>
                        )}
                        <p className="text-xs text-text-muted font-mono truncate max-w-[120px]">
                          {activity.txHash}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-muted">No activity in this collection yet</p>
              </div>
            )}
          </div>
        )}

        {/* Owners Tab */}
        {activeTab === "owners" && (
          <div className="animate-fade-in">
            {collectionOwners.length > 0 ? (
              <div className="rounded-xl bg-surface border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-bg-secondary border-b border-border text-xs font-medium text-text-muted">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Owner</div>
                  <div className="col-span-3">Address</div>
                  <div className="col-span-3 text-right">NFTs Owned</div>
                </div>
                {/* Rows */}
                {collectionOwners.map((item, index) => (
                  <div
                    key={item.owner.address}
                    className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-surface-hover transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="col-span-1 flex items-center">
                      <span className={cn(
                        "text-sm font-semibold",
                        index === 0 ? "text-warning" : index === 1 ? "text-text-secondary" : index === 2 ? "text-accent" : "text-text-muted"
                      )}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: generateGradient(item.owner.address) }}
                      >
                        {item.owner.name?.[0] || "?"}
                      </div>
                      <span className="text-sm font-medium text-text truncate">
                        {item.owner.name || "Unnamed"}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-xs text-text-muted font-mono truncate">
                        {formatAddress(item.owner.address)}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                        <Layers className="w-3.5 h-3.5" />
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-muted">No owners in this collection yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
