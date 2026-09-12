"use client";

import { use, useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Copy, Check, ExternalLink, Globe, AtSign, MessageCircle,
  Grid3X3, Plus, Activity, Heart, Tag, Clock, Users, Layers,
  ArrowRightLeft, Sparkles, Send, Gavel, Handshake, PackageOpen,
  Calendar, BadgeCheck, MoreHorizontal, Share
} from "lucide-react";
import { mockUsers } from "@/lib/mock-users";
import { mockNFTs, mockActivities } from "@/lib/mock-nfts";
import { fetchNFTs, fetchActivity } from "@/lib/user-store";
import { cn, formatAddress, generateGradient, formatDate, formatNimiq } from "@/lib/utils";
import type { NFT, Activity as ActivityType } from "@/types";

interface PageProps {
  params: Promise<{ address: string }>;
}

type SortOption = "recent" | "price_asc" | "price_desc";
type TabId = "collected" | "created" | "listed" | "activity" | "offers";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "price_asc", label: "Price Low-High" },
  { value: "price_desc", label: "Price High-Low" },
];

function sortNFTs(nfts: NFT[], sort: SortOption): NFT[] {
  const sorted = [...nfts];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

function ActivityIcon({ type }: { type: ActivityType["type"] }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "sale": return <ArrowRightLeft className={cn(cls, "text-success")} />;
    case "list": return <Tag className={cn(cls, "text-primary")} />;
    case "mint": return <Sparkles className={cn(cls, "text-accent")} />;
    case "transfer": return <Send className={cn(cls, "text-text-muted")} />;
    case "bid": return <Gavel className={cn(cls, "text-warning")} />;
    case "offer": return <Handshake className={cn(cls, "text-primary")} />;
    default: return <Clock className={cls} />;
  }
}

function getActivityDescription(activity: ActivityType): string {
  const from = activity.from?.name || "Unknown";
  const to = activity.to?.name || "Unknown";
  switch (activity.type) {
    case "sale": return from + " sold to " + to;
    case "list": return from + " listed";
    case "mint": return from + " minted";
    case "transfer": return from + " transferred to " + to;
    case "bid": return from + " placed a bid";
    case "offer": return from + " made an offer";
    default: return "Unknown activity";
  }
}

const mockOffers = [
  { id: "offer-1", nft: mockNFTs[0], fromUser: mockUsers[2], price: 14000, currency: "NIM" as const, timestamp: "2023-07-28T14:00:00Z", status: "pending" as const },
  { id: "offer-2", nft: mockNFTs[4], fromUser: mockUsers[1], price: 7000, currency: "NIM" as const, timestamp: "2023-07-26T09:30:00Z", status: "accepted" as const },
  { id: "offer-3", nft: mockNFTs[10], fromUser: mockUsers[3], price: 900, currency: "NIM" as const, timestamp: "2023-07-20T16:15:00Z", status: "declined" as const },
  { id: "offer-4", nft: mockNFTs[7], fromUser: mockUsers[1], price: 320, currency: "NIM" as const, timestamp: "2023-07-15T11:45:00Z", status: "pending" as const },
];

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as SortOption)} className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer">
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function EmptyTab({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <p className="text-text-secondary text-sm">{title}</p>
    </div>
  );
}

function NFTGridCard({ nft, index }: { nft: NFT; index: number }) {
  const [favorited, setFavorited] = useState(false);
  return (
    <Link href={"/nft/" + nft.id} className="group block animate-fade-in" style={{ animationDelay: (index * 80) + "ms" }}>
      <div className="nft-card-hover rounded-2xl bg-surface border border-border overflow-hidden transition-all duration-200">
        <div className="relative aspect-square overflow-hidden">
          <Image src={nft.image} alt={nft.name} fill className="object-cover transition-transform duration-300 group-hover:scale-110" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          {nft.listed && (
            <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium bg-success/90 text-white rounded-full z-10">Listed</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFavorited((p) => !p); }} className={cn("absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 z-10", favorited ? "bg-danger/20 text-danger" : "bg-black/30 text-white/70 hover:text-white opacity-0 group-hover:opacity-100")}>
            <Heart className={cn("w-4 h-4", favorited && "fill-current")} />
          </button>
          {nft.listed && (
            <Link href={`/nft/${nft.id}`} onClick={(e) => e.stopPropagation()} className="absolute bottom-3 left-3 right-3 py-2 rounded-xl bg-primary text-primary-text text-sm font-semibold text-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:bg-primary-hover">Buy Now</Link>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-text-muted truncate mb-1">{nft.collection.name}</p>
          <h3 className="text-sm font-semibold text-text truncate mb-2 group-hover:text-primary transition-colors">{nft.name}</h3>
          <p className="text-sm font-medium text-text">{formatNimiq(nft.price)}{" "}<span className="text-text-muted text-xs">{nft.currency}</span></p>
          {nft.lastSalePrice && (<p className="text-xs text-text-muted mt-1">Last sale: {formatNimiq(nft.lastSalePrice)} NIM</p>)}
        </div>
      </div>
    </Link>
  );
}

export default function ProfilePage({ params }: PageProps) {
  const { address: rawAddress } = use(params);
  const address = decodeURIComponent(rawAddress);

  const [activeTab, setActiveTab] = useState<TabId>("collected");
  const [collectedSort, setCollectedSort] = useState<SortOption>("recent");
  const [createdSort, setCreatedSort] = useState<SortOption>("recent");
  const [listedSort, setListedSort] = useState<SortOption>("recent");
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerDelta, setFollowerDelta] = useState(0);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiNFTs, setApiNFTs] = useState<any[]>([]);
  const [apiActivities, setApiActivities] = useState<any[]>([]);
  useEffect(() => { fetchNFTs().then(setApiNFTs).catch(() => {}); fetchActivity().then(setApiActivities).catch(() => {}); }, []);

  const user = mockUsers.find((u) => u.address === address);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleFollow = useCallback(() => {
    setIsFollowing((p) => !p);
    setFollowerDelta((p) => (isFollowing ? p - 1 : p + 1));
  }, [isFollowing]);

  const allNFTs = useMemo(() => {
    const apiIds = new Set(apiNFTs.map((n: any) => n.id));
    return [...apiNFTs, ...mockNFTs.filter((n: any) => !apiIds.has(n.id))];
  }, [apiNFTs]);

  const collectedNFTs = useMemo(
    () => sortNFTs(allNFTs.filter((nft) => nft.owner.address === user?.address), collectedSort),
    [user, collectedSort, allNFTs]
  );

  const createdNFTs = useMemo(
    () => sortNFTs(allNFTs.filter((nft) => nft.creator.address === user?.address), createdSort),
    [user, createdSort, allNFTs]
  );

  const listedNFTs = useMemo(
    () => sortNFTs(allNFTs.filter((nft) => nft.owner.address === user?.address && nft.listed), listedSort),
    [user, listedSort, allNFTs]
  );

  const userActivities = useMemo(() => {
    if (!user) return [];
    const allUserActs = [...apiActivities, ...mockActivities];
    return allUserActs
      .filter((a) => a.from?.address === user.address || a.to?.address === user.address)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [user, apiActivities]);

  const createdCollections = useMemo(() => {
    if (!user) return 0;
    return new Set(createdNFTs.map((nft) => nft.collection.id)).size;
  }, [user, createdNFTs]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-6">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">User not found</h3>
          <p className="text-sm text-text-secondary max-w-sm mb-6">No profile found for this address.</p>
          <Link href="/" className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors", "bg-primary text-primary-text hover:bg-primary-hover")}>Browse Marketplace</Link>
        </div>
      </div>
    );
  }

  const gradient = generateGradient(user.address);
  const joinDate = new Date(user.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const tabs = [
    { id: "collected" as const, label: "Collected", icon: Grid3X3, count: collectedNFTs.length },
    { id: "created" as const, label: "Created", icon: Plus, count: createdNFTs.length },
    { id: "listed" as const, label: "Listed", icon: Tag, count: listedNFTs.length },
    { id: "activity" as const, label: "Activity", icon: Activity, count: userActivities.length },
    { id: "offers" as const, label: "Offers", icon: Handshake, count: mockOffers.length },
  ];

  const stats = [
    { label: "Items Collected", value: collectedNFTs.length, icon: Layers },
    { label: "Items Created", value: createdNFTs.length, icon: Sparkles },
    { label: "Collections Created", value: createdCollections, icon: Grid3X3 },
    { label: "Followers", value: (user.followersCount || 0) + followerDelta, icon: Users },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative w-full h-48 sm:h-56" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />Back
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-surface shadow-lg flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shrink-0" style={{ background: gradient }}>
              {user.name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-text truncate">{user.name}</h1>
                <BadgeCheck className="w-6 h-6 text-primary shrink-0" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-text-muted font-mono">{formatAddress(user.address)}</span>
                <button onClick={handleCopy} className="p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text" aria-label="Copy address">
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm text-primary font-medium mb-2">{user.name.toLowerCase().replace(/\s+/g, "")}.nim</p>
              <p className="text-sm text-text-secondary mb-3">{user.bio}</p>
              <div className="flex items-center gap-3 mb-3">
                <button className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-all"><Globe className="w-4 h-4" /></button>
                <button className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-all"><AtSign className="w-4 h-4" /></button>
                <button className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-all"><MessageCircle className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Calendar className="w-4 h-4" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pb-1">
              <button onClick={handleFollow} className={cn("px-5 py-2.5 rounded-xl text-sm font-medium transition-colors", isFollowing ? "bg-surface border border-border text-text hover:text-danger hover:border-danger/50" : "bg-primary text-primary-text hover:bg-primary-hover")}>
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); }} className="p-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text transition-all">
                <Share className="w-4 h-4" />
              </button>
              <button className="p-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl bg-surface border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-text-muted" />
                  <span className="text-xs text-text-muted">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-text">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-1 p-1 bg-surface rounded-xl mb-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap", activeTab === tab.id ? "bg-primary text-primary-text" : "text-text-secondary hover:text-text")}>
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-medium", activeTab === tab.id ? "bg-primary-text/20 text-primary-text" : "bg-bg text-text-muted")}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="pb-16">
          {activeTab === "collected" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text">Collected ({collectedNFTs.length})</h2>
                <SortDropdown value={collectedSort} onChange={setCollectedSort} />
              </div>
              {collectedNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {collectedNFTs.map((nft, i) => <NFTGridCard key={nft.id} nft={nft} index={i} />)}
                </div>
              ) : (
                <EmptyTab icon={Grid3X3} title="No NFTs collected yet" />
              )}
            </div>
          )}

          {activeTab === "created" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text">Created ({createdNFTs.length})</h2>
                <SortDropdown value={createdSort} onChange={setCreatedSort} />
              </div>
              {createdNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {createdNFTs.map((nft, i) => <NFTGridCard key={nft.id} nft={nft} index={i} />)}
                </div>
              ) : (
                <EmptyTab icon={Plus} title="No NFTs created yet" />
              )}
            </div>
          )}

          {activeTab === "listed" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text">Listed ({listedNFTs.length})</h2>
                <SortDropdown value={listedSort} onChange={setListedSort} />
              </div>
              {listedNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {listedNFTs.map((nft, i) => <NFTGridCard key={nft.id} nft={nft} index={i} />)}
                </div>
              ) : (
                <EmptyTab icon={Tag} title="No NFTs currently listed" />
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-text mb-6">Activity ({userActivities.length})</h2>
              {userActivities.length > 0 ? (
                <div className="rounded-xl bg-surface border border-border divide-y divide-border">
                  {userActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-bg flex items-center justify-center shrink-0">
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">{getActivityDescription(activity)}</p>
                        <p className="text-xs text-text-muted mt-0.5">{formatDate(activity.timestamp)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {activity.price > 0 && (
                          <p className="text-sm font-medium text-text">{formatNimiq(activity.price)} {activity.currency}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5 justify-end">
                          <Link href={"https://nimiq.watch/tx/" + activity.txHash} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-text-muted font-mono hover:text-primary transition-colors">
                            {activity.txHash.slice(0, 8)}...
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyTab icon={Activity} title="No activity yet" />
              )}
            </div>
          )}

          {activeTab === "offers" && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold text-text mb-6">Offers ({mockOffers.length})</h2>
              {mockOffers.length > 0 ? (
                <div className="rounded-xl bg-surface border border-border divide-y divide-border">
                  {mockOffers.map((offer) => (
                    <div key={offer.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-bg border border-border shrink-0">
                        <Image src={offer.nft.image} alt={offer.nft.name} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={"/nft/" + offer.nft.id} className="text-sm font-medium text-text hover:text-primary transition-colors truncate block">{offer.nft.name}</Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium text-white" style={{ background: generateGradient(offer.fromUser.address) }}>{offer.fromUser.name?.[0]}</div>
                          <span className="text-xs text-text-muted">from {offer.fromUser.name}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-text">{formatNimiq(offer.price)} <span className="text-text-muted text-xs">{offer.currency}</span></p>
                        <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                          offer.status === "pending" ? "bg-warning/10 text-warning" :
                          offer.status === "accepted" ? "bg-success/10 text-success" :
                          "bg-danger/10 text-danger"
                        )}>{offer.status}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-text-muted">{formatDate(offer.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyTab icon={Handshake} title="No offers yet" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
