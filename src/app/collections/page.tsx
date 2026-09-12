"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Star,
  TrendingUp,
  ArrowUpDown,
  ChevronDown,
  BadgeCheck,
  Flame,
  Layers,
  Users,
  PackageOpen,
  RotateCcw,
  Filter,
} from "lucide-react";
import { mockCollections } from "@/lib/mock-users";
import { mockNFTs } from "@/lib/mock-nfts";
import { cn, formatNimiq, formatAddress, generateGradient } from "@/lib/utils";
import type { Collection } from "@/types";

const CATEGORIES = ["All", "Art", "Collectibles", "Gaming", "Music", "Photography"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

type SortKey =
  | "featured"
  | "floor_asc"
  | "floor_desc"
  | "volume_desc"
  | "volume_asc"
  | "items"
  | "owners"
  | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "floor_asc", label: "Floor Price: Low → High" },
  { value: "floor_desc", label: "Floor Price: High → Low" },
  { value: "volume_desc", label: "Volume: High → Low" },
  { value: "volume_asc", label: "Volume: Low → High" },
  { value: "items", label: "Most Items" },
  { value: "owners", label: "Most Owners" },
  { value: "newest", label: "Newest" },
];

function collectionBannerGradient(collection: Collection): string {
  const ch = collection.id.charCodeAt(4);
  const h1 = (ch * 7) % 360;
  const h2 = (ch * 7 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 60%, 45%), hsl(${h2}, 70%, 50%))`;
}

function CollectionCardComponent({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collection/${collection.slug}`}
      className="group block rounded-xl border border-border bg-surface overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="relative h-36" style={{ background: collectionBannerGradient(collection) }}>
        {collection.featured && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-warning/90 px-2.5 py-0.5 text-xs font-semibold text-white">
            <Flame className="w-3.5 h-3.5" />
            Featured
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end gap-3 -mt-8 mb-3">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface text-xl font-bold text-white shrink-0"
            style={{ background: generateGradient(collection.id) }}
          >
            {collection.name.charAt(0)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-base font-semibold text-text truncate group-hover:text-primary transition-colors">
            {collection.name}
          </h3>
          <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
        </div>

        <p className="text-sm text-muted mb-3 truncate">
          by {collection.creator.name}
        </p>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[11px] text-muted leading-tight">Floor</p>
            <p className="text-sm font-semibold text-text">{formatNimiq(collection.floorPrice)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted leading-tight">Volume</p>
            <p className="text-sm font-semibold text-text">{formatNimiq(collection.totalVolume)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted leading-tight">Items</p>
            <p className="text-sm font-semibold text-text">{formatNimiq(collection.totalItems)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted leading-tight">Owners</p>
            <p className="text-sm font-semibold text-text">{formatNimiq(collection.ownersCount)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<SortKey>("featured");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filteredCollections = useMemo(() => {
    let result = [...mockCollections];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.creator.name.toLowerCase().includes(q)
      );
    }

    if (category !== "All") {
      result = result.filter(
        (c) => c.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (featuredOnly) {
      result = result.filter((c) => c.featured);
    }

    switch (sort) {
      case "floor_asc":
        result.sort((a, b) => a.floorPrice - b.floorPrice);
        break;
      case "floor_desc":
        result.sort((a, b) => b.floorPrice - a.floorPrice);
        break;
      case "volume_desc":
        result.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case "volume_asc":
        result.sort((a, b) => a.totalVolume - b.totalVolume);
        break;
      case "items":
        result.sort((a, b) => b.totalItems - a.totalItems);
        break;
      case "owners":
        result.sort((a, b) => b.ownersCount - a.ownersCount);
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "featured":
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return result;
  }, [search, category, sort, featuredOnly]);

  const featuredCollections = useMemo(
    () => mockCollections.filter((c) => c.featured),
    []
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "All" ||
    featuredOnly ||
    sort !== "featured";

  function clearAllFilters() {
    setSearch("");
    setCategory("All");
    setSort("featured");
    setFeaturedOnly(false);
  }

  function removeFilter(type: "search" | "category" | "featured" | "sort") {
    switch (type) {
      case "search":
        setSearch("");
        break;
      case "category":
        setCategory("All");
        break;
      case "featured":
        setFeaturedOnly(false);
        break;
      case "sort":
        setSort("featured");
        break;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Collections</h1>
        <p className="text-text-secondary">
          Browse all NFT collections on the Nimiq blockchain
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections by name, description, or creator..."
          className="w-full rounded-lg border border-border bg-surface py-3 pl-11 pr-10 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
        {search.trim() && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                category === cat
                  ? "bg-primary text-primary-text"
                  : "bg-surface border border-border text-text-secondary hover:border-primary/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              featuredOnly
                ? "bg-primary text-primary-text"
                : "bg-surface border border-border text-text-secondary hover:border-primary/40"
            )}
          >
            <Star className="w-3.5 h-3.5" />
            Featured Only
          </button>

          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium bg-surface border border-border text-text-secondary hover:border-primary/40 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  sortOpen && "rotate-180"
                )}
              />
            </button>

            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-lg border border-border bg-surface shadow-xl py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSort(option.value);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        sort === option.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-text-secondary hover:bg-surface-hover"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted">Active filters:</span>
          {search.trim() && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Search: &ldquo;{search.trim()}&rdquo;
              <button onClick={() => removeFilter("search")} className="ml-0.5 hover:text-primary-hover">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {category !== "All" && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Category: {category}
              <button onClick={() => removeFilter("category")} className="ml-0.5 hover:text-primary-hover">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {featuredOnly && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Featured Only
              <button onClick={() => removeFilter("featured")} className="ml-0.5 hover:text-primary-hover">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sort !== "featured" && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Sort: {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              <button onClick={() => removeFilter("sort")} className="ml-0.5 hover:text-primary-hover">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="ml-1 text-xs text-muted hover:text-text underline transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      <p className="text-sm text-muted mb-6">
        Showing {filteredCollections.length} of {mockCollections.length} collections
      </p>

      {filteredCollections.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface border border-border mb-4">
            <PackageOpen className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-1">No collections found</h3>
          <p className="text-sm text-muted mb-6 max-w-sm">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-text text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          {/* Featured Collections Section */}
          {!featuredOnly &&
            category === "All" &&
            !search.trim() &&
            featuredCollections.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <Star className="w-5 h-5 text-warning" />
                  <h2 className="text-xl font-bold text-text">
                    Featured Collections
                  </h2>
                  <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                    <Flame className="w-3 h-3" />
                    Hot
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredCollections.map((collection, i) => (
                    <div
                      key={collection.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <CollectionCardComponent collection={collection} />
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* All Collections Section */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-text">
                  All Collections
                </h2>
                <span className="text-sm text-muted">
                  ({filteredCollections.length})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection, i) => (
                <div
                  key={collection.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <CollectionCardComponent collection={collection} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
