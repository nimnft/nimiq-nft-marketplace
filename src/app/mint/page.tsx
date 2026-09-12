"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Upload, X, Plus, Trash2, Image as ImageIcon, FileVideo,
  ArrowLeft, Check, AlertCircle, Info, Wallet, Coins,
  Globe, Sparkles, Eye, ChevronDown, Loader2,
  ExternalLink, Layers, Percent, AlertTriangle, Package,
} from "lucide-react";
import { cn, generateGradient } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-provider";
import { getExplorerTxUrl } from "@/types/activity";
import { MARKETPLACE_CONFIG } from "@/lib/wallet/config";
import { fetchCollections, createCollectionAPI, createNFTAPI, createActivityAPI } from "@/lib/user-store";
import type { Collection } from "@/types";

const MARKETPLACE = MARKETPLACE_CONFIG.marketplaceAddress;
const MINT_FEE = 5_000_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["PNG", "JPG", "GIF", "SVG", "WEBP", "MP4", "WEBM"];

interface PropertyRow { type: string; value: string; rarity: string; }
type MintState = "idle" | "reviewing" | "processing" | "success" | "error";
type MintTab = "single" | "collection";

export default function MintPage() {
  const { state: walletState, account, connect, isAvailable, service: walletService } = useWallet();
  const isConnected = walletState === "connected";

  const [activeTab, setActiveTab] = useState<MintTab>("single");

  const [form, setForm] = useState({
    name: "", description: "", externalUrl: "", collectionId: "", royalty: 2.5, supply: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [mintState, setMintState] = useState<MintState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintedNftId, setMintedNftId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isVideo = file?.type.startsWith("video/");

  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [showCollectionPopup, setShowCollectionPopup] = useState(false);
  const [newColForm, setNewColForm] = useState({ name: "", description: "", category: "" });
  const [newColImage, setNewColImage] = useState<string | null>(null);
  const [newColError, setNewColError] = useState<string | null>(null);
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const newColFileRef = useRef<HTMLInputElement>(null);

  // Single NFT tab state
  const [singleForm, setSingleForm] = useState({ name: "", description: "", externalUrl: "", royalty: 2.5, supply: 1 });
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleFilePreview, setSingleFilePreview] = useState<string | null>(null);
  const [singleErrors, setSingleErrors] = useState<Record<string, string>>({});
  const [singleIsDragOver, setSingleIsDragOver] = useState(false);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const singleNameInputRef = useRef<HTMLInputElement>(null);
  const singleIsVideo = singleFile?.type.startsWith("video/");

  useEffect(() => {
    if (isConnected && account?.address) {
      fetchCollections(account.address).then(setMyCollections).catch(() => {});
    }
  }, [isConnected, account?.address]);

  const selectedCollection = useMemo(() => {
    if (form.collectionId === "__new__") return null;
    return myCollections.find((c) => c.id === form.collectionId) || null;
  }, [form.collectionId, myCollections]);

  const isFormValid = useMemo(() => {
    return form.name.trim().length >= 1 && form.name.trim().length <= 50 && file !== null &&
      form.royalty >= 0 && form.royalty <= 10 && form.supply >= 1 && form.supply <= 10000;
  }, [form.name, file, form.royalty, form.supply]);

  const isSingleFormValid = useMemo(() => {
    return singleForm.name.trim().length >= 1 && singleForm.name.trim().length <= 50 && singleFile !== null;
  }, [singleForm.name, singleFile]);

  // --- File handling (collection tab) ------------------
  const handleFileSelect = useCallback((selected: File | null) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) { setErrors((p) => ({ ...p, file: "Max 50MB" })); return; }
    setErrors((p) => { const n = { ...p }; delete n.file; return n; });
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader(); reader.onload = (e) => setFilePreview(e.target?.result as string); reader.readAsDataURL(selected);
    } else { setFilePreview(null); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }, [handleFileSelect]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { handleFileSelect(e.target.files?.[0] || null); }, [handleFileSelect]);
  const clearFile = useCallback(() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }, []);
  const addProperty = useCallback(() => { setProperties((p) => [...p, { type: "", value: "", rarity: "" }]); }, []);
  const removeProperty = useCallback((i: number) => { setProperties((p) => p.filter((_, idx) => idx !== i)); }, []);
  const updateProperty = useCallback((i: number, field: keyof PropertyRow, value: string) => {
    setProperties((p) => { const u = [...p]; u[i] = { ...u[i], [field]: value }; return u; });
  }, []);

  // --- File handling (single tab) ----------------------
  const handleSingleFileSelect = useCallback((selected: File | null) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) { setSingleErrors((p) => ({ ...p, file: "Max 50MB" })); return; }
    setSingleErrors((p) => { const n = { ...p }; delete n.file; return n; });
    setSingleFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader(); reader.onload = (e) => setSingleFilePreview(e.target?.result as string); reader.readAsDataURL(selected);
    } else { setSingleFilePreview(null); }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  // --- Collection Tab Mint -----------------------------
  const validateCollectionMint = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!file) e.file = "Upload media";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form.name, file]);

  const handleMint = useCallback(() => {
    if (!validateCollectionMint()) return;
    setMintState("reviewing");
  }, [validateCollectionMint]);

  const confirmMint = useCallback(async (tab: "single" | "collection") => {
    if (!isConnected || !account?.address) { setMintError("Connect wallet first"); setMintState("error"); return; }
    setMintState("processing"); setMintError(null); setTxHash(null);

    const nftName = tab === "single" ? singleForm.name : form.name;
    const nftDesc = tab === "single" ? singleForm.description : form.description;
    const nftImage = tab === "single" ? (singleFilePreview || `https://picsum.photos/seed/nft${Date.now()}/400/400`) : (filePreview || `https://picsum.photos/seed/nft${Date.now()}/400/400`);
    const nftRoyalty = tab === "single" ? singleForm.royalty : form.royalty;
    const nftCollectionId = tab === "collection" ? (selectedCollection?.id || undefined) : undefined;

    try {
      const result = await walletService.sendTransaction({
        appName: "NimiqNFT", recipient: MARKETPLACE,
        value: MINT_FEE, fee: 0,
        extraData: new TextEncoder().encode(`mint:${nftName}`),
      });

      if (result?.hash) {
        setTxHash(result.hash);

        const nft = await createNFTAPI({
          name: nftName, description: nftDesc, image: nftImage,
          collectionId: nftCollectionId, creatorAddress: account.address,
          royalty: nftRoyalty, txHash: result.hash,
        });

        setMintedNftId(nft.id);
        setMintState("success");

        if (isConnected && account?.address) {
          fetchCollections(account.address).then(setMyCollections).catch(() => {});
        }
      } else { setMintError("No hash returned"); setMintState("error"); }
    } catch (err: any) {
      if (err?.message?.includes("cancel")) setMintError("Cancelled");
      else setMintError(err?.message || "Failed");
      setMintState("error");
    }
  }, [isConnected, account, walletService, form.name, form.description, form.royalty, selectedCollection, filePreview, singleForm, singleFilePreview]);

  const cancelMint = useCallback(() => { setMintState("idle"); setMintError(null); }, []);

  const resetForm = useCallback(() => {
    setForm({ name: "", description: "", externalUrl: "", collectionId: "", royalty: 2.5, supply: 1 });
    setFile(null); setFilePreview(null); setProperties([]); setErrors({});
    setSingleForm({ name: "", description: "", externalUrl: "", royalty: 2.5, supply: 1 });
    setSingleFile(null); setSingleFilePreview(null); setSingleErrors({});
    setMintState("idle"); setTxHash(null); setMintError(null); setMintedNftId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (singleFileInputRef.current) singleFileInputRef.current.value = "";
  }, []);

  const validProperties = properties.filter((p) => p.type && p.value);
  const explorerUrl = txHash ? getExplorerTxUrl(txHash) : null;

  // --- Collection Popup --------------------------------
  const handleCreateCollection = useCallback(async () => {
    if (!isConnected || !account?.address) { setNewColError("Connect wallet first"); return; }
    if (!newColForm.name.trim()) { setNewColError("Name required"); return; }
    if (!newColForm.category) { setNewColError("Select category"); return; }
    setIsCreatingCol(true); setNewColError(null);

    try {
      const col = await createCollectionAPI({
        name: newColForm.name.trim(), description: newColForm.description.trim(),
        image: newColImage || "", category: newColForm.category, creatorAddress: account.address,
      });
      setForm((p) => ({ ...p, collectionId: col.id }));
      setShowCollectionPopup(false);
      setNewColForm({ name: "", description: "", category: "" }); setNewColImage(null);
      const updated = await fetchCollections(account.address);
      setMyCollections(updated);
    } catch (err: any) {
      setNewColError(err.message || "Failed");
    } finally {
      setIsCreatingCol(false);
    }
  }, [isConnected, account, newColForm, newColImage]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text">Create</h1>
            <p className="text-text-secondary mt-1">Mint NFTs and create collections on Nimiq</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit mb-8">
          {([["single", Package, "Single NFT"], ["collection", Layers, "Collection"]] as const).map(([tab, Icon, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab ? "bg-primary text-primary-text" : "text-text-secondary hover:text-text")}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {!isAvailable && (
          <div className="mb-6 p-4 rounded-2xl bg-warning/10 border border-warning/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <div><p className="text-sm font-medium text-text">Nimiq Hub Required</p>
              <p className="text-xs text-text-secondary mt-0.5">Install <a href="https://nimiq.com/wallet" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Nimiq Hub</a> to mint.</p></div>
          </div>
        )}
        {isAvailable && !isConnected && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3"><Wallet className="w-5 h-5 text-primary" />
              <div><p className="text-sm font-medium text-text">Connect Wallet</p><p className="text-xs text-text-secondary mt-0.5">Connect to mint NFTs</p></div></div>
            <button onClick={connect} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors">Connect</button>
          </div>
        )}

        {activeTab === "single" ? (
          /* ========== SINGLE NFT TAB — NO COLLECTION SELECTOR ========== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-text mb-1">Media</h2>
                <p className="text-sm text-text-muted mb-4">Upload your NFT file</p>
                <div onDrop={(e) => { e.preventDefault(); setSingleIsDragOver(false); handleSingleFileSelect(e.dataTransfer.files[0]); }}
                  onDragOver={(e) => { e.preventDefault(); setSingleIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setSingleIsDragOver(false); }}
                  onClick={() => !singleFile && singleFileInputRef.current?.click()}
                  className={cn("relative border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                    singleFile ? "border-primary/40 bg-primary/5" : singleIsDragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-surface-hover",
                    singleErrors.file && "border-danger")}>
                  <input ref={singleFileInputRef} type="file" accept="image/*,video/*"
                    onChange={(e) => handleSingleFileSelect(e.target.files?.[0] || null)} className="hidden" />
                  {singleFile ? (
                    <div className="p-6">
                      <div className="relative rounded-xl overflow-hidden bg-bg-secondary">
                        {singleFilePreview && !singleIsVideo ? (
                          <div className="relative aspect-video"><Image src={singleFilePreview} alt="Preview" fill className="object-contain" unoptimized /></div>
                        ) : (
                          <div className="aspect-video flex items-center justify-center"><FileVideo className="w-16 h-16 text-text-muted" /></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div><p className="text-sm font-medium text-text truncate max-w-xs">{singleFile.name}</p><p className="text-xs text-text-muted mt-0.5">{formatFileSize(singleFile.size)}</p></div>
                        <button onClick={(e) => { e.stopPropagation(); setSingleFile(null); setSingleFilePreview(null); if (singleFileInputRef.current) singleFileInputRef.current.value = ""; }}
                          className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border transition-colors"><X className="w-4 h-4 text-text-secondary" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <Upload className={cn("w-12 h-12 mx-auto mb-4", singleIsDragOver ? "text-primary" : "text-text-muted")} />
                      <p className="text-text-secondary font-medium">Drag & drop or click</p>
                      <p className="text-sm text-text-muted mt-2">Max 50MB</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {ACCEPTED_EXTENSIONS.map((ext) => (<span key={ext} className="px-2 py-0.5 text-xs rounded-md bg-bg-secondary text-text-muted border border-border">{ext}</span>))}
                      </div>
                    </div>
                  )}
                </div>
                {singleErrors.file && <p className="text-danger text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{singleErrors.file}</p>}
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-text mb-4">Details</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Name <span className="text-danger">*</span></label>
                    <div className="relative">
                      <input ref={singleNameInputRef} type="text" value={singleForm.name} maxLength={50}
                        onChange={(e) => setSingleForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="NFT name"
                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 pr-16 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-muted">{singleForm.name.length}/50</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                    <textarea value={singleForm.description} maxLength={1000}
                      onChange={(e) => setSingleForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe your NFT..." rows={4}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">External URL</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="url" value={singleForm.externalUrl} onChange={(e) => setSingleForm((p) => ({ ...p, externalUrl: e.target.value }))} placeholder="https://..."
                        className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Royalty</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max="10" step="0.5" value={singleForm.royalty}
                        onChange={(e) => setSingleForm((p) => ({ ...p, royalty: parseFloat(e.target.value) }))}
                        className="flex-1 h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" />
                      <div className="relative w-20">
                        <input type="number" min="0" max="10" step="0.5" value={singleForm.royalty}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setSingleForm((p) => ({ ...p, royalty: v })); }}
                          className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 pr-7 text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Supply</label>
                    <div className="relative w-40">
                      <input type="number" min="1" max="10000" value={singleForm.supply}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 10000) setSingleForm((p) => ({ ...p, supply: v })); }}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                    </div>
                    <p className="text-xs text-text-muted mt-2">1 - 10,000 copies</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                  <div className="aspect-square relative bg-bg-secondary">
                    {singleFilePreview && !singleIsVideo ? (
                      <Image src={singleFilePreview} alt={singleForm.name || "Preview"} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: generateGradient(singleForm.name || "nft") }}>
                        <ImageIcon className="w-16 h-16 text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-text">{singleForm.name || "Untitled"}</h3>
                    {singleForm.description && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{singleForm.description}</p>}
                    <div className="mt-3"><span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">Minted on Nimiq</span></div>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface border border-border p-5">
                  <h3 className="text-sm font-semibold text-text mb-4">Costs</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Mint Fee</span><span className="text-text font-medium">50 NIM</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Network</span><span className="text-text font-medium">~0.01 NIM</span></div>
                    <div className="border-t border-border pt-3 mt-3"><div className="flex justify-between"><span className="text-sm font-semibold text-text">Total</span><span className="text-lg font-bold text-text">50 NIM</span></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========== COLLECTION TAB — WITH COLLECTION SELECTOR ========== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-text mb-1">Media</h2>
                <p className="text-sm text-text-muted mb-4">Upload your NFT file</p>
                <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={cn("relative border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                    file ? "border-primary/40 bg-primary/5" : isDragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-surface-hover",
                    errors.file && "border-danger")}>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileInput} className="hidden" />
                  {file ? (
                    <div className="p-6">
                      <div className="relative rounded-xl overflow-hidden bg-bg-secondary">
                        {filePreview && !isVideo ? (
                          <div className="relative aspect-video"><Image src={filePreview} alt="Preview" fill className="object-contain" unoptimized /></div>
                        ) : (
                          <div className="aspect-video flex items-center justify-center"><FileVideo className="w-16 h-16 text-text-muted" /></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div><p className="text-sm font-medium text-text truncate max-w-xs">{file.name}</p><p className="text-xs text-text-muted mt-0.5">{formatFileSize(file.size)}</p></div>
                        <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border transition-colors"><X className="w-4 h-4 text-text-secondary" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <Upload className={cn("w-12 h-12 mx-auto mb-4", isDragOver ? "text-primary" : "text-text-muted")} />
                      <p className="text-text-secondary font-medium">Drag & drop or click</p>
                      <p className="text-sm text-text-muted mt-2">Max 50MB</p>
                    </div>
                  )}
                </div>
                {errors.file && <p className="text-danger text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.file}</p>}
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-text mb-4">Details</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Name <span className="text-danger">*</span></label>
                    <div className="relative">
                      <input ref={nameInputRef} type="text" value={form.name} maxLength={50}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="NFT name"
                        className={cn("w-full bg-bg border rounded-xl px-4 py-3 pr-16 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
                          errors.name ? "border-danger" : "border-border")} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-muted">{form.name.length}/50</span>
                    </div>
                    {errors.name && <p className="text-danger text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                    <textarea value={form.description} maxLength={1000}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe..." rows={4}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none" />
                  </div>
                  {/* Collection selector */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Collection</label>
                    <div className="relative">
                      <select value={form.collectionId}
                        onChange={(e) => { if (e.target.value === "__new__") { setShowCollectionPopup(true); return; } setForm((p) => ({ ...p, collectionId: e.target.value })); }}
                        className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 pr-10 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors">
                        <option value="">Select a collection</option>
                        {myCollections.map((col) => (<option key={col.id} value={col.id}>{col.name}</option>))}
                        <option value="__new__">+ Create new collection</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Royalty</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max="10" step="0.5" value={form.royalty}
                        onChange={(e) => setForm((p) => ({ ...p, royalty: parseFloat(e.target.value) }))}
                        className="flex-1 h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" />
                      <div className="relative w-20">
                        <input type="number" min="0" max="10" step="0.5" value={form.royalty}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setForm((p) => ({ ...p, royalty: v })); }}
                          className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 pr-7 text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Supply</label>
                    <div className="relative w-40">
                      <input type="number" min="1" max="10000" value={form.supply}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 10000) setForm((p) => ({ ...p, supply: v })); }}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-text">Properties</h2>
                  <button onClick={addProperty} disabled={properties.length >= 10}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      properties.length >= 10 ? "text-text-muted cursor-not-allowed" : "text-primary hover:bg-primary/10")}>
                    <Plus className="w-4 h-4" />Add
                  </button>
                </div>
                {properties.length > 0 && (
                  <div className="space-y-3">
                    {properties.map((prop, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4"><input type="text" value={prop.type} onChange={(e) => updateProperty(i, "type", e.target.value)} placeholder="Type" className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" /></div>
                        <div className="col-span-4"><input type="text" value={prop.value} onChange={(e) => updateProperty(i, "value", e.target.value)} placeholder="Value" className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" /></div>
                        <div className="col-span-3"><input type="number" value={prop.rarity} onChange={(e) => updateProperty(i, "rarity", e.target.value)} placeholder="%" min="0" max="100" className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" /></div>
                        <div className="col-span-1 flex justify-end"><button onClick={() => removeProperty(i)} className="p-2 text-text-muted hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                  <div className="aspect-square relative bg-bg-secondary">
                    {filePreview && !isVideo ? (
                      <Image src={filePreview} alt={form.name || "Preview"} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: generateGradient(form.name || "nft") }}>
                        <ImageIcon className="w-16 h-16 text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-text-muted">{selectedCollection?.name || "No collection"}</p>
                    <h3 className="font-semibold text-text mt-1">{form.name || "Untitled"}</h3>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface border border-border p-5">
                  <h3 className="text-sm font-semibold text-text mb-4">Costs</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Mint Fee</span><span className="text-text font-medium">50 NIM</span></div>
                    <div className="border-t border-border pt-3 mt-3"><div className="flex justify-between"><span className="text-sm font-semibold text-text">Total</span><span className="text-lg font-bold text-text">50 NIM</span></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom buttons */}
        <div className="sticky bottom-0 lg:static mt-8 pb-4 lg:pb-0">
          <div className="flex flex-col sm:flex-row gap-3 bg-bg/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 rounded-2xl border border-border lg:border-0">
            {activeTab === "single" ? (
              <button onClick={() => { if (!isSingleFormValid) return; setMintState("reviewing"); }} disabled={!isSingleFormValid || !isConnected}
                className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors",
                  isSingleFormValid && isConnected ? "bg-primary text-primary-text hover:bg-primary-hover" : "bg-surface text-text-muted border border-border cursor-not-allowed")}>
                <Coins className="w-4 h-4" />{!isConnected ? "Connect Wallet" : "Mint NFT"}
              </button>
            ) : (
              <button onClick={handleMint} disabled={!isFormValid || !isConnected}
                className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors",
                  isFormValid && isConnected ? "bg-primary text-primary-text hover:bg-primary-hover" : "bg-surface text-text-muted border border-border cursor-not-allowed")}>
                <Coins className="w-4 h-4" />{!isConnected ? "Connect Wallet" : "Mint NFT"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====== COLLECTION CREATION POPUP ====== */}
      {showCollectionPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCollectionPopup(false); setNewColError(null); }} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text">Create Collection</h2>
              <button onClick={() => { setShowCollectionPopup(false); setNewColError(null); }} className="p-2 rounded-lg hover:bg-surface-hover transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
            </div>
            {newColError && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-500">{newColError}</p></div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Image</label>
                <div className={cn("relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer",
                  newColImage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-bg-secondary")}
                  onClick={() => !newColImage && newColFileRef.current?.click()}>
                  {newColImage ? (
                    <div className="relative w-24 h-24 mx-auto">
                      <Image src={newColImage} alt="Preview" fill className="object-cover rounded-xl" unoptimized />
                      <button onClick={(e) => { e.stopPropagation(); setNewColImage(null); if (newColFileRef.current) newColFileRef.current.value = ""; }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (<><Upload className="w-8 h-8 mx-auto text-text-muted mb-2" /><p className="text-sm text-text-secondary">Click to upload</p></>)}
                  <input ref={newColFileRef} type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const reader = new FileReader(); reader.onload = (ev) => setNewColImage(ev.target?.result as string); reader.readAsDataURL(f);
                  }} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Name *</label>
                <input type="text" value={newColForm.name} onChange={(e) => setNewColForm((p) => ({ ...p, name: e.target.value }))} placeholder="Collection name" maxLength={50}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                <textarea value={newColForm.description} onChange={(e) => setNewColForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe..." rows={2}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Category *</label>
                <div className="relative">
                  <select value={newColForm.category} onChange={(e) => setNewColForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors">
                    <option value="">Select</option>
                    <option value="art">Art</option><option value="collectibles">Collectibles</option><option value="gaming">Gaming</option><option value="music">Music</option><option value="photography">Photography</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>
              </div>
              <button onClick={handleCreateCollection}
                disabled={!isConnected || isCreatingCol || !newColForm.name.trim() || !newColForm.category}
                className={cn("w-full py-3 rounded-xl text-sm font-semibold transition-colors",
                  isConnected && !isCreatingCol && newColForm.name.trim() && newColForm.category
                    ? "bg-primary text-primary-text hover:bg-primary-hover" : "bg-bg text-text-muted border border-border cursor-not-allowed")}>
                {isCreatingCol ? "Creating..." : "Create Collection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MINT MODAL ====== */}
      {mintState !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={mintState === "processing" ? undefined : cancelMint} />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-lg">
            {mintState === "reviewing" && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><Eye className="w-7 h-7 text-primary" /></div>
                  <h2 className="text-xl font-bold text-text">Review & Confirm</h2>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm p-3 bg-bg rounded-xl"><span className="text-text-secondary">Name</span><span className="text-text font-medium">{activeTab === "single" ? singleForm.name : form.name}</span></div>
                  {selectedCollection && <div className="flex justify-between text-sm p-3 bg-bg rounded-xl"><span className="text-text-secondary">Collection</span><span className="text-text font-medium">{selectedCollection.name}</span></div>}
                  <div className="flex justify-between text-sm p-3 bg-primary/10 rounded-xl"><span className="text-text-secondary font-medium">Total</span><span className="text-primary font-bold">50 NIM</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={cancelMint} className="flex-1 py-3 rounded-xl text-sm font-medium bg-bg border border-border text-text-secondary hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={() => confirmMint(activeTab)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-text hover:bg-primary-hover transition-colors"><Check className="w-4 h-4" />Confirm</button>
                </div>
              </div>
            )}
            {mintState === "processing" && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                <h2 className="text-xl font-bold text-text mb-2">Minting...</h2>
                <p className="text-sm text-text-secondary">Confirm in Nimiq Hub</p>
              </div>
            )}
            {mintState === "success" && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-success" /></div>
                  <h2 className="text-xl font-bold text-text">Minted!</h2>
                </div>
                <div className="bg-bg rounded-xl p-4 mb-6">
                  <p className="text-xs text-text-muted mb-1">Tx Hash</p>
                  <p className="text-xs text-text font-mono break-all">{txHash}</p>
                  {explorerUrl && <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">View on Nimiq Scan<ExternalLink className="w-3 h-3" /></a>}
                </div>
                <div className="flex gap-3">
                  <Link href={`/nft/${mintedNftId}`} onClick={resetForm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-bg border border-border text-text-secondary hover:bg-surface-hover transition-colors"><Eye className="w-4 h-4" />View NFT</Link>
                  <button onClick={resetForm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-text hover:bg-primary-hover transition-colors"><Plus className="w-4 h-4" />Create Another</button>
                </div>
              </div>
            )}
            {mintState === "error" && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-danger" /></div>
                  <h2 className="text-xl font-bold text-text">Failed</h2><p className="text-sm text-text-secondary mt-1">{mintError}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={cancelMint} className="flex-1 py-3 rounded-xl text-sm font-medium bg-bg border border-border text-text-secondary hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={() => confirmMint(activeTab)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-text hover:bg-primary-hover transition-colors">Try Again</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
