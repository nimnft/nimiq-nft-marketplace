"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import {
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  Heart,
  Wallet,
  Search,
  ShoppingBag,
  Sparkles,
  BadgeCheck,
  Flame,
  Eye,
  Layers,
  ChevronRight,
  ArrowUpRight,
  ExternalLink,
  Zap,
  Shield,
  Globe,
} from "lucide-react"
import { mockNFTs } from "@/lib/mock-nfts"
import { mockCollections } from "@/lib/mock-users"
import { fetchNFTs } from "@/lib/user-store"
import { cn, formatNimiq, formatAddress, generateGradient } from "@/lib/utils"

const stats = [
  { label: "Total Volume", value: "1.2M", suffix: "NIM" },
  { label: "NFTs Listed", value: "12.4K", suffix: "" },
  { label: "Active Traders", value: "3.8K", suffix: "" },
  { label: "Collections", value: "240", suffix: "+" },
]

const steps = [
  { icon: Wallet, title: "Connect Wallet", description: "Link your Nimiq wallet securely in seconds." },
  { icon: Search, title: "Discover NFTs", description: "Browse curated collections and trending drops." },
  { icon: ShoppingBag, title: "Buy or Bid", description: "Purchase at fixed price or place bids." },
  { icon: Sparkles, title: "Collect or Sell", description: "Build your collection or list your NFTs." },
]

function HeroVisual() {
  return (
    <div className="relative hidden lg:flex items-center justify-center w-full h-[480px]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-primary/8 rounded-full blur-[100px]" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-accent/8 rounded-full blur-[100px]" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] border border-border/40 rounded-full animate-orbit" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border border-border/40 rounded-full animate-orbit-reverse" />

      <div className="relative z-10 w-24 h-24 rounded-2xl animate-pulse-glow shadow-lg shadow-primary/20 overflow-hidden">
        <img src="/logo.svg" alt="NimiqNFT" className="w-full h-full" />
      </div>

      <div className="absolute top-8 left-12 w-20 h-28 rounded-xl overflow-hidden shadow-xl animate-float rotate-[-8deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft1/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute top-16 right-10 w-20 h-28 rounded-xl overflow-hidden shadow-xl animate-float-delayed rotate-[6deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft3/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute bottom-20 left-8 w-20 h-28 rounded-xl overflow-hidden shadow-xl animate-float-slow rotate-[10deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft5/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute bottom-16 right-16 w-20 h-28 rounded-xl overflow-hidden shadow-xl animate-float rotate-[-5deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft7/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute top-1/2 -left-4 w-16 h-22 rounded-xl overflow-hidden shadow-xl animate-float-delayed rotate-[12deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft9/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute top-1/2 -right-2 w-16 h-22 rounded-xl overflow-hidden shadow-xl animate-float-slow rotate-[-14deg] ring-2 ring-border/20">
        <Image
          src="https://picsum.photos/seed/nft11/200/280"
          alt="NFT"
          fill
          className="object-cover"
        />
      </div>
    </div>
  )
}

export default function HomePage() {
  const [favorited, setFavorited] = useState<Record<string, boolean>>({})
  const [userNFTs, setUserNFTs] = useState<any[]>([]);

  useEffect(() => {
    fetchNFTs().then(setUserNFTs).catch(() => {});
  }, []);

  const allNFTs = (() => {
    const apiIds = new Set(userNFTs.map((n: any) => n.id));
    return [...userNFTs, ...mockNFTs.filter((n: any) => !apiIds.has(n.id))];
  })();
  const featuredCollections = mockCollections.filter((c) => c.featured).slice(0, 4);
  const trendingNFTs = allNFTs.filter((n: any) => n.listed).slice(0, 8);
  const recentlyListed = allNFTs.filter((n: any) => n.listed).slice(0, 8);

  const toggleFavorite = (id: string) => {
    setFavorited((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] dark:from-primary/[0.06] dark:via-transparent dark:to-accent/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Built on Nimiq
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Discover, Collect &amp; Create NFTs on{" "}
                <span className="text-gradient">Nimiq</span>
              </h1>

              <p className="max-w-lg text-lg text-text-text-secondary leading-relaxed">
                The premier marketplace for Nimiq-native NFTs. Trade unique digital assets with
                zero-friction transactions on the world&apos;s most accessible blockchain.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-text transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                >
                  Explore NFTs
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/mint"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text transition-all hover:bg-surface-hover hover:border-primary/30 active:scale-[0.98]"
                >
                  Create NFT
                  <Layers className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-border">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold">
                      {stat.value}
                      {stat.suffix && (
                        <span className="text-sm font-medium text-text-muted ml-0.5">{stat.suffix}</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Trending NFTs */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Trending NFTs</h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {trendingNFTs.map((nft, i) => (
              <div
                key={nft.id}
                className={cn(
                  "group relative rounded-2xl border border-border bg-surface overflow-hidden nft-card-hover animate-fade-in"
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {nft.listed && (
                    <div className="absolute top-3 left-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Listed
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        toggleFavorite(nft.id)
                      }}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors",
                        favorited[nft.id]
                          ? "bg-danger/90 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                    >
                      <Heart
                        className={cn("h-4 w-4", favorited[nft.id] && "fill-current")}
                      />
                    </button>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent text-[9px] font-bold text-white">
                      {nft.creator.name.charAt(0)}
                    </div>
                    <span className="text-xs text-text-muted truncate">{nft.collection.name}</span>
                  </div>

                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {nft.name}
                  </h3>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-text-muted">Price</div>
                      <div className="font-bold text-sm">
                        {formatNimiq(nft.price)}
                        <span className="text-text-muted font-normal ml-1">
                          NIM
                        </span>
                      </div>
                    </div>
                    {nft.lastSalePrice && (
                      <div className="text-right">
                        <div className="text-xs text-text-muted">Last Sale</div>
                        <div className="text-xs font-medium text-text-muted">
                          {formatNimiq(nft.lastSalePrice)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Collections */}
      <section className="py-16 sm:py-20 bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-warning/10">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <h2 className="text-2xl font-bold">Popular Collections</h2>
            </div>
            <Link
              href="/collections"
              className="inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {featuredCollections.map((collection, i) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className={cn(
                  "group rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="relative h-28 w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(collection.id.charCodeAt(4) * 7) % 360}, 60%, 45%), hsl(${(collection.id.charCodeAt(4) * 7 + 50) % 360}, 70%, 50%))`,
                  }}
                >
                  {collection.featured && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Flame className="h-3 w-3" />
                      Featured
                    </div>
                  )}
                </div>

                <div className="relative px-4 pb-4">
                  <div className="-mt-8 mb-3">
                    <div className="w-14 h-14 rounded-xl border-2 border-surface bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold text-white shadow-md">
                      {collection.name.charAt(0)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {collection.name}
                    </h3>
                    <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Floor</div>
                      <div className="text-xs font-bold mt-0.5">{formatNimiq(collection.floorPrice)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Volume</div>
                      <div className="text-xs font-bold mt-0.5">{formatNimiq(collection.totalVolume)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Items</div>
                      <div className="text-xs font-bold mt-0.5">{collection.totalItems.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-text-secondary max-w-lg mx-auto">
              Start collecting NFTs on Nimiq in four simple steps. No complex setup required.
            </p>
          </div>

          <div className="relative grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-border bg-surface p-6 text-center space-y-4 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-text-muted" />
                  </div>
                )}

                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent text-white text-sm font-bold shadow-lg shadow-primary/20">
                  {i + 1}
                </div>

                <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>

                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Listed */}
      <section className="py-16 sm:py-20 bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Recently Listed</h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {recentlyListed.map((nft, i) => (
              <div
                key={nft.id}
                className={cn(
                  "group relative rounded-2xl border border-border bg-surface overflow-hidden nft-card-hover animate-fade-in"
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {nft.listed && (
                    <div className="absolute top-3 left-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Listed
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        toggleFavorite(nft.id)
                      }}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors",
                        favorited[nft.id]
                          ? "bg-danger/90 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                    >
                      <Heart
                        className={cn("h-4 w-4", favorited[nft.id] && "fill-current")}
                      />
                    </button>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent text-[9px] font-bold text-white">
                      {nft.creator.name.charAt(0)}
                    </div>
                    <span className="text-xs text-text-muted truncate">{nft.collection.name}</span>
                  </div>

                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {nft.name}
                  </h3>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-text-muted">Price</div>
                      <div className="font-bold text-sm">
                        {formatNimiq(nft.price)}
                        <span className="text-text-muted font-normal ml-1">
                          NIM
                        </span>
                      </div>
                    </div>
                    {nft.lastSalePrice && (
                      <div className="text-right">
                        <div className="text-xs text-text-muted">Last Sale</div>
                        <div className="text-xs font-medium text-text-muted">
                          {formatNimiq(nft.lastSalePrice)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-accent/[0.05] dark:from-primary/[0.08] dark:via-transparent dark:to-accent/[0.08]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Start Creating Today
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Join thousands of creators and collectors on the Nimiq blockchain. Mint your first NFT
            in minutes with zero gas fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-text transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            >
              Create Your First NFT
              <Zap className="h-4 w-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-7 py-3.5 text-sm font-semibold text-text transition-all hover:bg-surface-hover hover:border-primary/30 active:scale-[0.98]"
            >
              Explore Marketplace
              <Globe className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
