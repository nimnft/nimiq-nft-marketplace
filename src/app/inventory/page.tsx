"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Tag, Coins, Shield, AlertCircle, Check,
  X, Loader2, ExternalLink, Eye, Gavel,
  PackageOpen, RotateCcw, Info, Wallet, TrendingUp,
  AlertTriangle, Pencil, Trash2, DollarSign,
} from "lucide-react";
import { mockNFTs } from "@/lib/mock-nfts";
import { fetchNFTs, createActivityAPI } from "@/lib/user-store";
import { cn, formatNimiq, generateGradient } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-provider";
import { getExplorerTxUrl } from "@/types/activity";
import { MARKETPLACE_CONFIG } from "@/lib/wallet/config";
import type { NFT } from "@/types";

const MARKETPLACE = MARKETPLACE_CONFIG.marketplaceAddress;

const MARKETPLACE_FEE = 0.025;
const CREATOR_ROYALTY = 0.025;
const GAS_FEE_LUNA = 1_000;

type Duration = "1d" | "3d" | "7d" | "30d" | "forever";
type TxState = "idle" | "reviewing" | "processing" | "success" | "error";
type ModalMode = "list" | "change-price" | "delist";

const DURATIONS: { value: Duration; label: string }[] = [
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "forever", label: "Forever" },
];

function getDurationLabel(d: Duration): string {
  return DURATIONS.find((item) => item.value === d)?.label ?? d;
}

function formatAddress(addr: string): string {
  const clean = addr.replace(/\s/g, "");
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export default function SellPage() {
  const { state: walletState, account, connect, isAvailable, service: walletService } = useWallet();
  const isConnected = walletState === "connected";

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedNFTId, setSelectedNFTId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiNFTs, setApiNFTs] = useState<any[]>([]);

  useEffect(() => { fetchNFTs().then(setApiNFTs).catch(() => {}); }, [refreshKey]);

  const allNFTs = useMemo(() => {
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    const uniqueMock = mockNFTs.filter((n: any) => !apiIds.has(n.id));
    return [...apiNFTs, ...uniqueMock];
  }, [apiNFTs]);

  const myNFTs = useMemo(() => {
    if (!account?.address) return [];
    return allNFTs.filter((nft) => nft.owner.address === account.address);
  }, [account?.address, allNFTs]);

  const selectedNFT = useMemo(
    () => allNFTs.find((nft) => nft.id === selectedNFTId) ?? null,
    [selectedNFTId, allNFTs]
  );

  const currentPriceNIM = useMemo(() => {
    if (!selectedNFT) return 0;
    return (selectedNFT.price || 0) / 100_000;
  }, [selectedNFT]);

  const newPriceNum = useMemo(() => {
    const val = parseFloat(newPrice);
    return isNaN(val) ? 0 : val;
  }, [newPrice]);

  const handleOpenModal = useCallback((id: string, mode: ModalMode) => {
    setSelectedNFTId(id);
    setModalMode(mode);
    const nft = allNFTs.find((n) => n.id === id);
    if (mode === "change-price" && nft) {
      setNewPrice(((nft.price || 0) / 100_000).toString());
    } else {
      setNewPrice("");
    }
    setTxState("idle");
    setTxHash(null);
    setTxError(null);
  }, [allNFTs]);

  const handleCloseModal = useCallback(() => {
    if (txState === "processing") return;
    setModalMode(null);
    setSelectedNFTId(null);
    setTxState("idle");
    setTxError(null);
  }, [txState]);

  const handleConfirm = useCallback(async () => {
    if (!isConnected || !account?.address || !selectedNFT || !modalMode) {
      setTxError("Please connect your wallet first");
      setTxState("error");
      return;
    }

    if (modalMode === "delist") {
      setTxState("processing");
      setTxError(null);
      try {
        const result = await walletService.sendTransaction({
          appName: "NimiqNFT",
          recipient: MARKETPLACE,
          value: GAS_FEE_LUNA,
          fee: 0,
          extraData: new TextEncoder().encode(`delist:${selectedNFT.id}`),
        });

        if (result?.hash) {
          setTxHash(result.hash);
          await fetch("/api/user/nfts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nftId: selectedNFT.id, listed: false, price: 0 }),
          });
          createActivityAPI({
            type: "delist",
            nftId: selectedNFT.id,
            userAddress: account.address,
            fromAddress: account.address,
            price: 0,
            txHash: result.hash,
          }).catch(() => {});
          setTxState("success");
          setRefreshKey((k) => k + 1);
        } else {
          setTxError("Transaction failed - no hash returned");
          setTxState("error");
        }
      } catch (err: any) {
        if (err?.name === "OperationCanceledException" || err?.message?.includes("cancel")) {
          setTxError("Transaction was cancelled by user");
        } else {
          setTxError(err?.message || "Transaction failed");
        }
        setTxState("error");
      }
      return;
    }

    if (newPriceNum <= 0) {
      setTxError("Price must be greater than 0");
      setTxState("error");
      return;
    }

    setTxState("processing");
    setTxError(null);

    try {
      const priceLuna = Math.round(newPriceNum * 100_000);
      const action = modalMode === "change-price" ? "relist" : "list";
      const result = await walletService.sendTransaction({
        appName: "NimiqNFT",
        recipient: MARKETPLACE,
        value: GAS_FEE_LUNA,
        fee: 0,
        extraData: new TextEncoder().encode(`${action}:${selectedNFT.id}:fixed`),
      });

      if (result?.hash) {
        setTxHash(result.hash);
        await fetch("/api/user/nfts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nftId: selectedNFT.id, price: priceLuna, listed: true }),
        });
        createActivityAPI({
          type: modalMode === "change-price" ? "relist" : "list",
          nftId: selectedNFT.id,
          userAddress: account.address,
          fromAddress: account.address,
          price: priceLuna,
          txHash: result.hash,
        }).catch(() => {});
        setTxState("success");
        setRefreshKey((k) => k + 1);
      } else {
        setTxError("Transaction failed - no hash returned");
        setTxState("error");
      }
    } catch (err: any) {
      if (err?.name === "OperationCanceledException" || err?.message?.includes("cancel")) {
        setTxError("Transaction was cancelled by user");
      } else {
        setTxError(err?.message || "Transaction failed");
      }
      setTxState("error");
    }
  }, [isConnected, account, walletService, selectedNFT, modalMode, newPriceNum]);

  const explorerUrl = txHash ? getExplorerTxUrl(txHash) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAvailable && (
          <div className="mb-6 p-4 rounded-2xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Nimiq Hub Required</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Please install the Nimiq Hub extension to list NFTs.{" "}
                  <a href="https://nimiq.com/wallet" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Get it here
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {isAvailable && !isConnected && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-text">Connect Your Wallet</p>
                  <p className="text-xs text-text-secondary mt-0.5">You need to connect your wallet to manage your listings</p>
                </div>
              </div>
              <button
                onClick={connect}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Sell Inventory</h1>
          <p className="text-text-secondary mt-2">
            {isConnected
              ? "Manage your NFT listings - list, change price, or delist"
              : "Connect your wallet to see your NFTs"}
          </p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-6">
              <Wallet className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Wallet not connected</h3>
            <p className="text-sm text-text-secondary max-w-sm text-center">
              Connect your wallet to see and manage your NFTs
            </p>
          </div>
        ) : myNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myNFTs.map((nft, index) => {
              const isListed = nft.listed;
              const priceNIM = (nft.price || 0) / 100_000;
              return (
                <div
                  key={nft.id}
                  className="rounded-2xl border border-border bg-surface overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm",
                          isListed
                            ? "bg-success/90 text-white"
                            : "bg-surface/90 text-text-secondary border border-border"
                        )}
                      >
                        {isListed ? "Listed" : "Not Listed"}
                      </span>
                    </div>
                    {isListed && (
                      <div className="absolute bottom-2 left-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/90 text-white backdrop-blur-sm">
                          <Coins className="h-2.5 w-2.5" />
                          {priceNIM.toFixed(2)} NIM
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-[11px] text-text-muted truncate">{nft.collection.name}</p>
                      <h3 className="font-medium text-sm text-text truncate">{nft.name}</h3>
                    </div>

                    {isListed && (
                      <div className="text-xs text-text-secondary">
                        Listed at <span className="text-text font-medium">{priceNIM.toFixed(2)} NIM</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {isListed ? (
                        <>
                          <button
                            onClick={() => handleOpenModal(nft.id, "change-price")}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Change Price
                          </button>
                          <button
                            onClick={() => handleOpenModal(nft.id, "delist")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(nft.id, "list")}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                          List for Sale
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-6">
              <PackageOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">No NFTs found</h3>
            <p className="text-sm text-text-secondary max-w-sm text-center mb-6">
              You don&apos;t own any NFTs yet. Mint or buy some first.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        )}
      </div>

      {modalMode && selectedNFT && (
        <ListingModal
          mode={modalMode}
          nft={selectedNFT}
          txState={txState}
          txHash={txHash}
          txError={txError}
          explorerUrl={explorerUrl}
          account={account}
          newPrice={newPrice}
          currentPriceNIM={currentPriceNIM}
          newPriceNum={newPriceNum}
          onPriceChange={setNewPrice}
          onConfirm={handleConfirm}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function ListingModal({
  mode,
  nft,
  txState,
  txHash,
  txError,
  explorerUrl,
  account,
  newPrice,
  currentPriceNIM,
  newPriceNum,
  onPriceChange,
  onConfirm,
  onClose,
}: {
  mode: ModalMode;
  nft: NFT;
  txState: TxState;
  txHash: string | null;
  txError: string | null;
  explorerUrl: string | null;
  account: { address: string; label?: string } | null;
  newPrice: string;
  currentPriceNIM: number;
  newPriceNum: number;
  onPriceChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = useCallback(() => {
    if (txHash) {
      navigator.clipboard.writeText(txHash).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [txHash]);

  const title = mode === "list" ? "List NFT for Sale" : mode === "change-price" ? "Change Price" : "Delist NFT";
  const feeLuna = Math.round(newPriceNum * 100_000);
  const marketplaceFeeNIM = newPriceNum * MARKETPLACE_FEE;
  const creatorRoyaltyNIM = newPriceNum * CREATOR_ROYALTY;
  const proceedsNIM = newPriceNum * (1 - MARKETPLACE_FEE - CREATOR_ROYALTY);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        {txState === "idle" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                <Image src={nft.image} alt={nft.name} fill sizes="64px" className="object-cover" unoptimized />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-muted truncate">{nft.collection.name}</p>
                <h3 className="font-semibold text-text truncate">{nft.name}</h3>
              </div>
            </div>

            {mode === "delist" ? (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    This will remove your NFT from the marketplace. It will no longer be available for purchase.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {mode === "change-price" ? `Current Price: ${currentPriceNIM.toFixed(2)} NIM` : "Price (NIM)"}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => onPriceChange(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className="w-full rounded-xl border border-border bg-bg pl-11 pr-4 py-3 text-text placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {newPriceNum > 0 && (
                  <div className="rounded-xl border border-border bg-bg p-3.5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Marketplace Fee (2.5%)</span>
                      <span className="text-text">{marketplaceFeeNIM.toFixed(2)} NIM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Creator Royalty (2.5%)</span>
                      <span className="text-text">{creatorRoyaltyNIM.toFixed(2)} NIM</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                      <span className="text-text">You Receive</span>
                      <span className="text-primary">{proceedsNIM.toFixed(2)} NIM</span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-bg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Gas Fee</span>
                    <span className="text-text">~0.01 NIM</span>
                  </div>
                </div>
              </div>
            )}

            {mode === "delist" && (
              <div className="rounded-xl border border-border bg-bg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Gas Fee</span>
                  <span className="text-text">~0.01 NIM</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-surface hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={mode !== "delist" && newPriceNum <= 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  (mode === "delist" || newPriceNum > 0)
                    ? mode === "delist"
                      ? "bg-danger text-white hover:bg-danger/90 shadow-lg shadow-danger/20 active:scale-[0.98]"
                      : "bg-primary text-primary-text hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-[0.98]"
                    : "bg-surface text-text-muted border border-border cursor-not-allowed"
                )}
              >
                {mode === "delist" ? (
                  <><Trash2 className="h-4 w-4" /> Confirm Delist</>
                ) : (
                  <><Tag className="h-4 w-4" /> {mode === "change-price" ? "Update Price" : "List for Sale"}</>
                )}
              </button>
            </div>
          </div>
        )}

        {txState === "processing" && (
          <div className="p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-surface-hover border-t-primary animate-spin" />
              <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-text mb-2">Processing...</h2>
            <p className="text-sm text-text-muted">Please confirm in your Nimiq Hub wallet.</p>
          </div>
        )}

        {txState === "success" && (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">
              {mode === "delist" ? "NFT Delisted!" : mode === "change-price" ? "Price Updated!" : "NFT Listed!"}
            </h2>
            <p className="text-sm text-text-secondary mb-6 max-w-xs">
              {mode === "delist"
                ? "Your NFT has been removed from the marketplace."
                : "Your listing has been updated on the blockchain."}
            </p>

            {txHash && (
              <div className="rounded-xl bg-bg border border-border px-4 py-3 mb-6 w-full max-w-sm">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-text font-mono truncate flex-1">{txHash}</p>
                  <button onClick={handleCopyHash} className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {explorerUrl && (
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs text-primary mt-2 hover:underline">
                    View on Nimiq Scan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold bg-primary text-primary-text hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        )}

        {txState === "error" && (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-danger/10 border-2 border-danger flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-danger" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Transaction Failed</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-xs">{txError}</p>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                onClick={onConfirm}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold bg-primary text-primary-text hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-surface hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
