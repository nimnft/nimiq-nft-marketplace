"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Heart,
  ShoppingCart,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpDown,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import { mockNFTs } from "@/lib/mock-nfts";
import { mockCollections } from "@/lib/mock-users";
import { fetchNFTs } from "@/lib/user-store";
import { cn, formatNimiq, generateGradient } from "@/lib/utils";
import type { NFT, FilterCategory, SortOption } from "@/types";

const CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "art", label: "Art" },
  { value: "photography", label: "Photography" },
  { value: "gaming", label: "Gaming" },
  { value: "collectibles", label: "Collectibles" },
  { value: "music", label: "Music" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently Listed" },
  { value: "newest", label: "Recently Created" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
  { value: "volume", label: "Highest Volume" },
];

const ITEMS_PER_PAGE = 12;

function getUniqueCreators(nfts: NFT[]): string[] {
  const names = new Set(nfts.map((n) => n.creator.name));
  return Array.from(names).sort();
}

function matchesSearch(nft: NFT, query: string): boolean {
  const q = query.toLowerCase();
  return (
    nft.name.toLowerCase().includes(q) ||
    nft.collection.name.toLowerCase().includes(q) ||
    nft.creator.name.toLowerCase().includes(q) ||
    nft.description.toLowerCase().includes(q)
  );
}

function applySort(nfts: NFT[], sort: SortOption): NFT[] {
  const sorted = [...nfts];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "popular":
      return sorted.sort(
        (a, b) => (b.lastSalePrice ?? 0) - (a.lastSalePrice ?? 0)
      );
    case "volume":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    case "recent":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

interface FilterState {
  search: string;
  category: FilterCategory;
  minPrice: string;
  maxPrice: string;
  collection: string;
  creator: string;
  listedOnly: boolean;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  category: "all",
  minPrice: "",
  maxPrice: "",
  collection: "",
  creator: "",
  listedOnly: false,
  sort: "recent",
};

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export default function ExplorePage() {
  const [apiNFTs, setApiNFTs] = useState<any[]>([]);
  useEffect(() => { fetchNFTs().then(setApiNFTs).catch(() => {}); }, []);

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        if (key !== "sort") setVisibleCount(ITEMS_PER_PAGE);
        return next;
      });
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const creators = useMemo(() => {
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const uniqueMock = mockNFTs.filter((n: any) => !apiIds.has(n.id));
    return getUniqueCreators([...apiNFTs, ...uniqueMock]);
  }, [apiNFTs]);

  const filteredNFTs = useMemo(() => {
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const uniqueMock = mockNFTs.filter((n: any) => !apiIds.has(n.id));
    let result = [...apiNFTs, ...uniqueMock];

    if (filters.search) {
      result = result.filter((nft) => matchesSearch(nft, filters.search));
    }

    if (filters.category !== "all") {
      result = result.filter(
        (nft) =>
          nft.collection.category.toLowerCase() ===
          filters.category.toLowerCase()
      );
    }

    const minPrice = filters.minPrice ? parseFloat(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : null;
    if (minPrice !== null) {
      result = result.filter((nft) => nft.price >= minPrice!);
    }
    if (maxPrice !== null) {
      result = result.filter((nft) => nft.price <= maxPrice!);
    }

    if (filters.collection) {
      result = result.filter(
        (nft) => nft.collection.name === filters.collection
      );
    }

    if (filters.creator) {
      result = result.filter((nft) => nft.creator.name === filters.creator);
    }

    if (filters.listedOnly) {
      result = result.filter((nft) => nft.listed);
    }

    return applySort(result, filters.sort);
  }, [filters, apiNFTs]);

  const visibleNFTs = useMemo(
    () => filteredNFTs.slice(0, visibleCount),
    [filteredNFTs, visibleCount]
  );

  const hasMore = visibleCount < filteredNFTs.length;
  const remainingCount = filteredNFTs.length - visibleCount;

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];

    if (filters.search) {
      chips.push({
        key: "search",
        label: "Search",
        value: filters.search,
        onRemove: () => updateFilter("search", ""),
      });
    }

    if (filters.category !== "all") {
      const cat = CATEGORIES.find((c) => c.value === filters.category);
      chips.push({
        key: "category",
        label: "Category",
        value: cat?.label ?? filters.category,
        onRemove: () => updateFilter("category", "all"),
      });
    }

    if (filters.minPrice) {
      chips.push({
        key: "minPrice",
        label: "Min Price",
        value: `${filters.minPrice} NIM`,
        onRemove: () => updateFilter("minPrice", ""),
      });
    }

    if (filters.maxPrice) {
      chips.push({
        key: "maxPrice",
        label: "Max Price",
        value: `${filters.maxPrice} NIM`,
        onRemove: () => updateFilter("maxPrice", ""),
      });
    }

    if (filters.collection) {
      chips.push({
        key: "collection",
        label: "Collection",
        value: filters.collection,
        onRemove: () => updateFilter("collection", ""),
      });
    }

    if (filters.creator) {
      chips.push({
        key: "creator",
        label: "Creator",
        value: filters.creator,
        onRemove: () => updateFilter("creator", ""),
      });
    }

    if (filters.listedOnly) {
      chips.push({
        key: "listedOnly",
        label: "Listed",
        value: "Only",
        onRemove: () => updateFilter("listedOnly", false),
      });
    }

    return chips;
  }, [filters, updateFilter]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-text mb-2">Explore NFTs</h1>
        <div className="flex items-center justify-between">
          <p className="text-text-secondary">
            Discover unique digital assets from the Nimiq ecosystem
          </p>
          <p className="text-sm text-text-muted hidden sm:block">
            Showing {visibleNFTs.length} of {filteredNFTs.length} NFTs
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-text-muted" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search by name, collection, creator, or description..."
            className="w-full rounded-xl border border-border bg-surface pl-11 pr-10 py-3 text-sm text-text placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="mb-4 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => updateFilter("category", cat.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                  filters.category === cat.value
                    ? "bg-primary text-primary-text shadow-sm shadow-primary/20"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-text"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-5 w-px bg-border" />

          {/* Price Range */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                placeholder="Min"
                min="0"
                className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">
                NIM
              </span>
            </div>
            <span className="text-text-muted text-xs">-</span>
            <div className="relative">
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                placeholder="Max"
                min="0"
                className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">
                NIM
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-5 w-px bg-border" />

          {/* Collection Dropdown */}
          <div className="relative">
            <select
              value={filters.collection}
              onChange={(e) => updateFilter("collection", e.target.value)}
              className="appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 py-1.5 text-xs text-text-secondary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">All Collections</option>
              {mockCollections.map((col) => (
                <option key={col.id} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          </div>

          {/* Creator Dropdown */}
          <div className="relative">
            <select
              value={filters.creator}
              onChange={(e) => updateFilter("creator", e.target.value)}
              className="appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 py-1.5 text-xs text-text-secondary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">All Creators</option>
              {creators.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          </div>

          <div className="hidden sm:block h-5 w-px bg-border" />

          {/* Listed Only Toggle */}
          <button
            onClick={() => updateFilter("listedOnly", !filters.listedOnly)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              filters.listedOnly
                ? "bg-primary text-primary-text shadow-sm shadow-primary/20"
                : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            <div
              className={cn(
                "relative w-7 h-4 rounded-full transition-colors",
                filters.listedOnly ? "bg-primary-text/20" : "bg-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                  filters.listedOnly
                    ? "left-3.5 bg-primary-text"
                    : "left-0.5 bg-text-muted"
                )}
              />
            </div>
            Listed Only
          </button>

          <div className="hidden sm:block h-5 w-px bg-border" />

          {/* Sort Dropdown */}
          <div className="relative ml-auto">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
              <select
                value={filters.sort}
                onChange={(e) =>
                  updateFilter("sort", e.target.value as SortOption)
                }
                className="appearance-none rounded-lg border border-border bg-surface pl-2 pr-8 py-1.5 text-xs text-text-secondary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "150ms" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 pl-3 pr-1.5 py-1 text-xs font-medium text-primary"
              >
                <span className="text-text-muted">{chip.label}:</span>
                {chip.value}
                <button
                  onClick={chip.onRemove}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* NFT Grid or Empty State */}
      {filteredNFTs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-6">
            <PackageOpen className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-text mb-2">
            No NFTs found
          </h3>
          <p className="text-text-muted text-sm mb-6 text-center max-w-sm">
            Try adjusting your search or filters to find what you&apos;re
            looking for.
          </p>
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-text transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
            {visibleNFTs.map((nft, index) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                index={index}
                isFavorited={!!favorites[nft.id]}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {/* Pagination / Load More */}
          <div className="mt-10 flex justify-center animate-fade-in">
            {hasMore ? (
              <button
                onClick={() =>
                  setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text transition-all hover:bg-surface-hover hover:border-primary/30 active:scale-[0.98]"
              >
                Load More
                <span className="text-text-muted font-normal">
                  ({remainingCount} remaining)
                </span>
              </button>
            ) : (
              <p className="text-sm text-text-muted py-3">
                All NFTs loaded
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NFTCard({
  nft,
  index,
  isFavorited,
  onToggleFavorite,
}: {
  nft: NFT;
  index: number;
  isFavorited: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/nft/${nft.id}`}
      className={cn(
        "group relative rounded-2xl border border-border bg-surface overflow-hidden nft-card-hover animate-fade-in"
      )}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={nft.image}
          alt={nft.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Listed Badge */}
        {nft.listed && (
          <div className="absolute top-3 left-3 rounded-full bg-success/90 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Listed
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top-right Actions */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => onToggleFavorite(nft.id, e)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors",
              isFavorited
                ? "bg-danger/90 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            <Heart
              className={cn("h-4 w-4", isFavorited && "fill-current")}
            />
          </button>
        </div>

        {/* Bottom-right Buy Button */}
        {nft.listed && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Link
              href={`/nft/${nft.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-text shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Buy Now
            </Link>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-2.5">
        {/* Creator + Collection */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold text-white shrink-0"
            style={{
              background: generateGradient(nft.creator.name),
            }}
          >
            {nft.creator.name.charAt(0)}
          </div>
          <span className="text-[11px] text-text-muted truncate">
            {nft.collection.name}
          </span>
        </div>

        {/* NFT Name */}
        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
          {nft.name}
        </h3>

        {/* Price Row */}
        <div className="flex items-end justify-between pt-0.5">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
              Price
            </p>
            <p className="font-bold text-sm leading-none">
              {formatNimiq(nft.price)}{" "}
              <span className="text-text-muted font-normal text-xs">NIM</span>
            </p>
          </div>
          {nft.lastSalePrice != null && (
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
                Last Sale
              </p>
              <p className="text-xs font-medium text-text-muted leading-none">
                {formatNimiq(nft.lastSalePrice)} NIM
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
