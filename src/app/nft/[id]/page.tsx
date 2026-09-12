"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Heart, Share2, Eye, Copy, ExternalLink,
  Check, X, ZoomIn, ZoomOut, ArrowRightLeft, Tag,
  Sparkles, Send, Gavel, Handshake, BadgeCheck, Clock, FileText,
  Layers, User, Shield, AlertTriangle, PackageOpen, Loader2,
} from "lucide-react";
import { mockNFTs, mockActivities } from "@/lib/mock-nfts";
import { fetchNFTs, fetchActivity, createActivityAPI } from "@/lib/user-store";
import { cn, formatAddress, generateGradient, formatDate, formatNimiq } from "@/lib/utils";
import type { NFT, Activity } from "@/types";
import { useWallet } from "@/lib/wallet-provider";
import { getExplorerTxUrl } from "@/types/activity";
import { MARKETPLACE_CONFIG } from "@/lib/wallet/config";

const MARKETPLACE = MARKETPLACE_CONFIG.marketplaceAddress;
const GAS_FEE_LUNA = 1_000;

interface PageProps {
  params: Promise<{ id: string }>;
}

const mockPriceHistory = [
  { date: "2023-01-01", price: 800 },
  { date: "2023-02-15", price: 1200 },
  { date: "2023-03-10", price: 950 },
  { date: "2023-04-20", price: 1500 },
  { date: "2023-05-25", price: 2200 },
  { date: "2023-06-15", price: 2800 },
];

type Tab = "details" | "properties" | "activity";

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "sale":
      return <ArrowRightLeft className={cn(cls, "text-success")} />;
    case "list":
      return <Tag className={cn(cls, "text-primary")} />;
    case "mint":
      return <Sparkles className={cn(cls, "text-accent")} />;
    case "transfer":
      return <Send className={cn(cls, "text-text-muted")} />;
    case "bid":
      return <Gavel className={cn(cls, "text-warning")} />;
    case "offer":
      return <Handshake className={cn(cls, "text-primary")} />;
    default:
      return <Clock className={cls} />;
  }
}

export default function NFTDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [apiNFTs, setApiNFTs] = useState<any[]>([]);
  const [apiActivities, setApiActivities] = useState<any[]>([]);
  const { state: walletState, account, connect, isAvailable, service: walletService } = useWallet();
  const isConnected = walletState === "connected";

  useEffect(() => {
    Promise.all([fetchNFTs(), fetchActivity()]).then(([nfts, acts]) => {
      setApiNFTs(nfts);
      setApiActivities(acts);
    }).catch(() => {});
  }, []);

  const allNFTs = useMemo(() => {
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const uniqueMock = mockNFTs.filter((n: any) => !apiIds.has(n.id));
    return [...apiNFTs, ...uniqueMock];
  }, [apiNFTs]);
  const nft = useMemo(() => allNFTs.find((n: any) => n.id === id) ?? null, [allNFTs, id]);

  const activities = useMemo(() => {
    const allActs = [...apiActivities, ...mockActivities];
    return allActs.filter((a: any) => a.nft?.id === id || a.nftId === id);
  }, [apiActivities, id]);

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyState, setBuyState] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [buyHash, setBuyHash] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  const handleBuy = useCallback(() => {
    setShowBuyModal(true);
    setBuyState("idle");
    setBuyHash(null);
    setBuyError(null);
  }, []);

  const handleConfirmBuy = useCallback(async () => {
    if (!isConnected || !account?.address || !nft) {
      setBuyError("Please connect your wallet");
      setBuyState("error");
      return;
    }

    setBuyState("processing");
    setBuyError(null);

    try {
      const priceLuna = nft.price || 0;
      const result = await walletService.sendTransaction({
        appName: "NimiqNFT",
        recipient: MARKETPLACE,
        value: priceLuna + GAS_FEE_LUNA,
        fee: 0,
        extraData: new TextEncoder().encode(`buy:${nft.id}`),
      });

      if (result?.hash) {
        setBuyHash(result.hash);

        // Transfer ownership
        await fetch("/api/user/nfts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nftId: nft.id,
            ownerAddress: account.address,
            listed: false,
            price: 0,
          }),
        });

        // Log activity
        createActivityAPI({
          type: "sale",
          nftId: nft.id,
          userAddress: account.address,
          fromAddress: nft.owner.address,
          toAddress: account.address,
          price: priceLuna,
          txHash: result.hash,
        }).catch(() => {});

        setBuyState("success");
      } else {
        setBuyError("Transaction failed");
        setBuyState("error");
      }
    } catch (err: any) {
      if (err?.name === "OperationCanceledException" || err?.message?.includes("cancel")) {
        setBuyError("Transaction was cancelled");
      } else {
        setBuyError(err?.message || "Transaction failed");
      }
      setBuyState("error");
    }
  }, [isConnected, account, walletService, nft]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  if (!nft) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-6">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">NFT not found</h3>
          <p className="text-sm text-text-secondary max-w-sm mb-6">
            The NFT you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors",
              "bg-primary text-primary-text hover:bg-primary-hover"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const explorerUrl = buyHash ? getExplorerTxUrl(buyHash) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Image */}
        <div className="relative">
          <div className="sticky top-24 rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="aspect-square relative overflow-hidden">
              <Image
                src={nft.image}
                alt={nft.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
                unoptimized
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <button onClick={handleZoomIn} className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button onClick={handleZoomOut} className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-text-muted mb-1">{nft.collection.name}</p>
            <h1 className="text-3xl font-bold text-text">{nft.name}</h1>
          </div>

          {nft.description && (
            <p className="text-text-secondary leading-relaxed">{nft.description}</p>
          )}

          <div className="flex items-center gap-4">
            <Link href={`/profile/${nft.owner.address}`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: generateGradient(nft.owner.name) }}>
                {nft.owner.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-text-muted">Owner</p>
                <p className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                  {nft.owner.name || formatAddress(nft.owner.address)}
                </p>
              </div>
            </Link>
          </div>

          {/* Price + Buy */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            {nft.listed ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Current Price</span>
                  <span className="text-2xl font-bold text-text">
                    {formatNimiq(nft.price)} <span className="text-base font-normal text-text-muted">NIM</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span>{nft.lastSalePrice ? `Last sale: ${formatNimiq(nft.lastSalePrice)} NIM` : "New listing"}</span>
                </div>

                <button
                  onClick={handleBuy}
                  className="w-full py-3 rounded-xl bg-primary text-primary-text font-semibold text-base hover:bg-primary-hover transition-colors"
                >
                  Buy Now
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Not Listed</p>
                  <p className="text-xs text-text-muted">This NFT is not currently for sale</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-6">
              {(["details", "properties", "activity"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-3 text-sm font-medium capitalize transition-colors border-b-2",
                    activeTab === tab
                      ? "text-primary border-primary"
                      : "text-text-muted border-transparent hover:text-text"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
                <div className="flex justify-between p-4">
                  <span className="text-sm text-text-secondary">Contract Address</span>
                  <span className="text-sm text-text font-mono">{formatAddress(nft.contractAddress)}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-text-secondary">Token ID</span>
                  <span className="text-sm text-text font-mono">{nft.tokenId}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-text-secondary">Token Standard</span>
                  <span className="text-sm text-text">NRC-721</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-text-secondary">Chain</span>
                  <span className="text-sm text-text">Nimiq</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-text-secondary">Creator Royalties</span>
                  <span className="text-sm text-text">{nft.royaltyPercent}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "properties" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {nft.traits.map((trait: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-3 text-center">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{trait.type}</p>
                  <p className="text-sm font-semibold text-text mt-1">{trait.value}</p>
                  {trait.rarity > 0 && (
                    <p className="text-[10px] text-primary mt-0.5">{trait.rarity}% have this</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((entry: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                    <ActivityIcon type={entry.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="font-medium capitalize">{entry.type}</span>
                        {entry.from && (
                          <> by <Link href={`/profile/${entry.from.address}`} className="text-primary hover:underline">{entry.from.name || formatAddress(entry.from.address)}</Link></>
                        )}
                      </p>
                      <p className="text-[11px] text-text-muted">{formatDate(entry.timestamp)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-text-muted">{formatNimiq(entry.price)} NIM</span>
                      {entry.txHash && getExplorerTxUrl(entry.txHash) && (
                        <a href={getExplorerTxUrl(entry.txHash)!} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-primary hover:underline">
                          View TX
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted text-center py-8">No activity yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => buyState !== "processing" && setShowBuyModal(false)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
            {buyState === "idle" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text">Confirm Purchase</h2>
                  <button onClick={() => setShowBuyModal(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"><X size={18} /></button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                    <Image src={nft.image} alt={nft.name} fill sizes="64px" className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted truncate">{nft.collection.name}</p>
                    <h3 className="font-semibold text-text truncate">{nft.name}</h3>
                  </div>
                </div>
                <div className="text-center py-3 rounded-xl bg-bg border border-border">
                  <p className="text-2xl font-bold text-text">
                    {formatNimiq(nft.price)} <span className="text-base font-normal text-text-muted">NIM</span>
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-bg p-3.5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Marketplace Fee (2.5%)</span>
                    <span className="text-text">{((nft.price * 0.025) / 100_000).toFixed(2)} NIM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Creator Royalty (2.5%)</span>
                    <span className="text-text">{((nft.price * 0.025) / 100_000).toFixed(2)} NIM</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-text">Total Cost</span>
                    <span className="text-primary">{((nft.price * 1.05) / 100_000).toFixed(2)} NIM</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowBuyModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-semibold hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={handleConfirmBuy} className="flex-1 py-3 rounded-xl bg-primary text-primary-text font-semibold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">Confirm Purchase</button>
                </div>
              </div>
            )}

            {buyState === "processing" && (
              <div className="p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-surface-hover border-t-primary animate-spin" />
                  <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                </div>
                <h2 className="text-lg font-semibold text-text mb-2">Processing Purchase...</h2>
                <p className="text-sm text-text-muted">Please confirm in your Nimiq Hub wallet.</p>
              </div>
            )}

            {buyState === "success" && (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mb-6">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-xl font-bold text-text mb-2">Purchase Complete!</h2>
                <p className="text-sm text-text-secondary mb-6">You now own <span className="font-medium text-text">{nft.name}</span></p>
                {buyHash && (
                  <div className="rounded-xl bg-bg border border-border px-4 py-3 mb-6 w-full max-w-sm">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Transaction Hash</p>
                    <p className="text-xs text-text font-mono truncate">{buyHash}</p>
                    {explorerUrl && (
                      <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs text-primary mt-2 hover:underline">
                        View on Nimiq Scan <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
                <div className="flex gap-3 w-full max-w-sm">
                  <Link href={`/inventory`} className="flex-1 py-3 rounded-xl bg-primary text-primary-text font-semibold text-center hover:bg-primary-hover transition-colors">View in Inventory</Link>
                  <button onClick={() => setShowBuyModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-semibold hover:bg-surface-hover transition-colors">Close</button>
                </div>
              </div>
            )}

            {buyState === "error" && (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-danger/10 border-2 border-danger flex items-center justify-center mb-6">
                  <X className="h-8 w-8 text-danger" />
                </div>
                <h2 className="text-xl font-bold text-text mb-2">Purchase Failed</h2>
                <p className="text-sm text-text-secondary mb-6">{buyError}</p>
                <div className="flex gap-3 w-full max-w-sm">
                  <button onClick={handleConfirmBuy} className="flex-1 py-3 rounded-xl bg-primary text-primary-text font-semibold hover:bg-primary-hover transition-colors">Try Again</button>
                  <button onClick={() => setShowBuyModal(false)} className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-semibold hover:bg-surface-hover transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
