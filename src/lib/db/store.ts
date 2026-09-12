/**
 * Persistent JSON File Database Store
 * Saves all data to data.json on disk — survives server restarts.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  User, Collection, Nft, Listing, Sale, Offer, Auction,
  Activity, Favorite, SignedMessage, BlockchainIndex,
} from "./schema";

const DATA_FILE = join(process.cwd(), "data.json");

interface PersistedData {
  users: [string, User][];
  collections: [string, Collection][];
  nfts: [string, Nft][];
  listings: [string, Listing][];
  sales: [string, Sale][];
  offers: [string, Offer][];
  auctions: [string, Auction][];
  activities: [string, Activity][];
  favorites: [string, Favorite][];
  signedMessages: [string, SignedMessage][];
  blockchainIndex: [string, BlockchainIndex][];
  nftByOwner: [string, string[]][];
  nftByCreator: [string, string[]][];
  nftByCollection: [string, string[]][];
  listingByNft: [string, string][];
  listingBySeller: [string, string[]][];
  activeListings: string[];
  collectionByCreator: [string, string[]][];
  collectionBySlug: [string, string][];
  userByAddress: [string, string][];
  activityByNft: [string, string[]][];
  activityByUser: [string, string[]][];
  favoriteByUser: [string, string[]][];
  favoriteByNft: [string, string[]][];
}

class Store {
  users = new Map<string, User>();
  collections = new Map<string, Collection>();
  nfts = new Map<string, Nft>();
  listings = new Map<string, Listing>();
  sales = new Map<string, Sale>();
  offers = new Map<string, Offer>();
  auctions = new Map<string, Auction>();
  activities = new Map<string, Activity>();
  favorites = new Map<string, Favorite>();
  signedMessages = new Map<string, SignedMessage>();
  blockchainIndex = new Map<string, BlockchainIndex>();

  nftByOwner = new Map<string, Set<string>>();
  nftByCreator = new Map<string, Set<string>>();
  nftByCollection = new Map<string, Set<string>>();
  listingByNft = new Map<string, string>();
  listingBySeller = new Map<string, Set<string>>();
  activeListings = new Set<string>();
  collectionByCreator = new Map<string, Set<string>>();
  collectionBySlug = new Map<string, string>();
  userByAddress = new Map<string, string>();
  activityByNft = new Map<string, Set<string>>();
  activityByUser = new Map<string, Set<string>>();
  favoriteByUser = new Map<string, Set<string>>();
  favoriteByNft = new Map<string, Set<string>>();

  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleSave() {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.persist(); }, 500);
  }

  private persist() {
    try {
      const data: PersistedData = {
        users: [...this.users],
        collections: [...this.collections],
        nfts: [...this.nfts],
        listings: [...this.listings],
        sales: [...this.sales],
        offers: [...this.offers],
        auctions: [...this.auctions],
        activities: [...this.activities],
        favorites: [...this.favorites],
        signedMessages: [...this.signedMessages],
        blockchainIndex: [...this.blockchainIndex],
        nftByOwner: [...this.nftByOwner].map(([k, s]) => [k, [...s]]),
        nftByCreator: [...this.nftByCreator].map(([k, s]) => [k, [...s]]),
        nftByCollection: [...this.nftByCollection].map(([k, s]) => [k, [...s]]),
        listingByNft: [...this.listingByNft],
        listingBySeller: [...this.listingBySeller].map(([k, s]) => [k, [...s]]),
        activeListings: [...this.activeListings],
        collectionByCreator: [...this.collectionByCreator].map(([k, s]) => [k, [...s]]),
        collectionBySlug: [...this.collectionBySlug],
        userByAddress: [...this.userByAddress],
        activityByNft: [...this.activityByNft].map(([k, s]) => [k, [...s]]),
        activityByUser: [...this.activityByUser].map(([k, s]) => [k, [...s]]),
        favoriteByUser: [...this.favoriteByUser].map(([k, s]) => [k, [...s]]),
        favoriteByNft: [...this.favoriteByNft].map(([k, s]) => [k, [...s]]),
      };
      writeFileSync(DATA_FILE, JSON.stringify(data), "utf-8");
      this.dirty = false;
    } catch (e) { console.error("Failed to persist store:", e); }
  }

  loadFromDisk() {
    if (!existsSync(DATA_FILE)) return false;
    try {
      const raw = readFileSync(DATA_FILE, "utf-8");
      const data: PersistedData = JSON.parse(raw);
      this.users = new Map(data.users);
      this.collections = new Map(data.collections);
      this.nfts = new Map(data.nfts);
      this.listings = new Map(data.listings);
      this.sales = new Map(data.sales);
      this.offers = new Map(data.offers);
      this.auctions = new Map(data.auctions);
      this.activities = new Map(data.activities);
      this.favorites = new Map(data.favorites);
      this.signedMessages = new Map(data.signedMessages);
      this.blockchainIndex = new Map(data.blockchainIndex);
      this.nftByOwner = new Map(data.nftByOwner.map(([k, v]) => [k, new Set(v)]));
      this.nftByCreator = new Map(data.nftByCreator.map(([k, v]) => [k, new Set(v)]));
      this.nftByCollection = new Map(data.nftByCollection.map(([k, v]) => [k, new Set(v)]));
      this.listingByNft = new Map(data.listingByNft);
      this.listingBySeller = new Map(data.listingBySeller.map(([k, v]) => [k, new Set(v)]));
      this.activeListings = new Set(data.activeListings);
      this.collectionByCreator = new Map(data.collectionByCreator.map(([k, v]) => [k, new Set(v)]));
      this.collectionBySlug = new Map(data.collectionBySlug);
      this.userByAddress = new Map(data.userByAddress);
      this.activityByNft = new Map(data.activityByNft.map(([k, v]) => [k, new Set(v)]));
      this.activityByUser = new Map(data.activityByUser.map(([k, v]) => [k, new Set(v)]));
      this.favoriteByUser = new Map(data.favoriteByUser.map(([k, v]) => [k, new Set(v)]));
      this.favoriteByNft = new Map(data.favoriteByNft.map(([k, v]) => [k, new Set(v)]));
      console.log(`Loaded from disk: ${this.users.size} users, ${this.collections.size} collections, ${this.nfts.size} NFTs`);
      return true;
    } catch (e) { console.error("Failed to load store:", e); return false; }
  }

  // ─── Users ────────────────────────────────────────────
  createUser(user: User): User {
    this.users.set(user.id, user);
    this.userByAddress.set(user.address, user.id);
    this.scheduleSave();
    return user;
  }
  getUser(id: string) { return this.users.get(id); }
  getUserByAddress(address: string) { const id = this.userByAddress.get(address); return id ? this.users.get(id) : undefined; }
  updateUser(id: string, updates: Partial<User>) {
    const user = this.users.get(id); if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated); this.scheduleSave(); return updated;
  }

  // ─── Collections ──────────────────────────────────────
  createCollection(collection: Collection): Collection {
    this.collections.set(collection.id, collection);
    this.collectionBySlug.set(collection.slug, collection.id);
    const creatorCols = this.collectionByCreator.get(collection.creatorAddress) || new Set();
    creatorCols.add(collection.id);
    this.collectionByCreator.set(collection.creatorAddress, creatorCols);
    this.scheduleSave();
    return collection;
  }
  getCollection(id: string) { return this.collections.get(id); }
  getCollectionBySlug(slug: string) { const id = this.collectionBySlug.get(slug); return id ? this.collections.get(id) : undefined; }
  updateCollection(id: string, updates: Partial<Collection>) {
    const col = this.collections.get(id); if (!col) return undefined;
    if (updates.slug && updates.slug !== col.slug) { this.collectionBySlug.delete(col.slug); this.collectionBySlug.set(updates.slug, id); }
    const updated = { ...col, ...updates, updatedAt: new Date().toISOString() };
    this.collections.set(id, updated); this.scheduleSave(); return updated;
  }

  // ─── NFTs ─────────────────────────────────────────────
  createNft(nft: Nft): Nft {
    this.nfts.set(nft.id, nft);
    const ownerNfts = this.nftByOwner.get(nft.ownerAddress) || new Set(); ownerNfts.add(nft.id); this.nftByOwner.set(nft.ownerAddress, ownerNfts);
    const creatorNfts = this.nftByCreator.get(nft.creatorAddress) || new Set(); creatorNfts.add(nft.id); this.nftByCreator.set(nft.creatorAddress, creatorNfts);
    const colNfts = this.nftByCollection.get(nft.collectionId) || new Set(); colNfts.add(nft.id); this.nftByCollection.set(nft.collectionId, colNfts);
    const col = this.collections.get(nft.collectionId);
    if (col) { col.totalItems++; this.collections.set(nft.collectionId, col); }
    this.scheduleSave();
    return nft;
  }
  getNft(id: string) { return this.nfts.get(id); }
  updateNft(id: string, updates: Partial<Nft>) {
    const nft = this.nfts.get(id); if (!nft) return undefined;
    if (updates.ownerAddress && updates.ownerAddress !== nft.ownerAddress) {
      const old = this.nftByOwner.get(nft.ownerAddress); if (old) old.delete(id);
      const nw = this.nftByOwner.get(updates.ownerAddress) || new Set(); nw.add(id); this.nftByOwner.set(updates.ownerAddress, nw);
    }
    const updated = { ...nft, ...updates, updatedAt: new Date().toISOString() };
    this.nfts.set(id, updated); this.scheduleSave(); return updated;
  }
  getNftsByOwner(address: string) { const ids = this.nftByOwner.get(address) || new Set(); return Array.from(ids).map((id) => this.nfts.get(id)!).filter(Boolean); }
  getNftsByCreator(address: string) { const ids = this.nftByCreator.get(address) || new Set(); return Array.from(ids).map((id) => this.nfts.get(id)!).filter(Boolean); }
  getNftsByCollection(collectionId: string) { const ids = this.nftByCollection.get(collectionId) || new Set(); return Array.from(ids).map((id) => this.nfts.get(id)!).filter(Boolean); }

  // ─── Listings ─────────────────────────────────────────
  createListing(listing: Listing): Listing {
    this.listings.set(listing.id, listing);
    this.listingByNft.set(listing.nftId, listing.id);
    const sellerListings = this.listingBySeller.get(listing.sellerAddress) || new Set(); sellerListings.add(listing.id); this.listingBySeller.set(listing.sellerAddress, sellerListings);
    if (listing.status === "active") this.activeListings.add(listing.id);
    this.scheduleSave();
    return listing;
  }
  getListing(id: string) { return this.listings.get(id); }
  getListingByNft(nftId: string) { const id = this.listingByNft.get(nftId); return id ? this.listings.get(id) : undefined; }
  updateListing(id: string, updates: Partial<Listing>) {
    const listing = this.listings.get(id); if (!listing) return undefined;
    if (updates.status) { if (updates.status === "active") this.activeListings.add(id); else this.activeListings.delete(id); }
    const updated = { ...listing, ...updates, updatedAt: new Date().toISOString() };
    this.listings.set(id, updated); this.scheduleSave(); return updated;
  }

  // ─── Sales ────────────────────────────────────────────
  createSale(sale: Sale): Sale { this.sales.set(sale.id, sale); this.scheduleSave(); return sale; }
  getSale(id: string) { return this.sales.get(id); }

  // ─── Offers ───────────────────────────────────────────
  createOffer(offer: Offer): Offer { this.offers.set(offer.id, offer); this.scheduleSave(); return offer; }
  getOffer(id: string) { return this.offers.get(id); }
  updateOffer(id: string, updates: Partial<Offer>) {
    const offer = this.offers.get(id); if (!offer) return undefined;
    const updated = { ...offer, ...updates, updatedAt: new Date().toISOString() };
    this.offers.set(id, updated); this.scheduleSave(); return updated;
  }

  // ─── Auctions ─────────────────────────────────────────
  createAuction(auction: Auction): Auction { this.auctions.set(auction.id, auction); this.scheduleSave(); return auction; }
  getAuction(id: string) { return this.auctions.get(id); }
  updateAuction(id: string, updates: Partial<Auction>) {
    const auction = this.auctions.get(id); if (!auction) return undefined;
    const updated = { ...auction, ...updates, updatedAt: new Date().toISOString() };
    this.auctions.set(id, updated); this.scheduleSave(); return updated;
  }

  // ─── Activity ─────────────────────────────────────────
  createActivity(activity: Activity): Activity {
    this.activities.set(activity.id, activity);
    if (activity.nftId) { const n = this.activityByNft.get(activity.nftId) || new Set(); n.add(activity.id); this.activityByNft.set(activity.nftId, n); }
    const u = this.activityByUser.get(activity.userAddress) || new Set(); u.add(activity.id); this.activityByUser.set(activity.userAddress, u);
    this.scheduleSave();
    return activity;
  }
  getActivity(id: string) { return this.activities.get(id); }

  // ─── Favorites ────────────────────────────────────────
  addFavorite(userId: string, nftId: string): Favorite {
    const id = `${userId}-${nftId}`;
    const f: Favorite = { id, userId, nftId, createdAt: new Date().toISOString() };
    this.favorites.set(id, f);
    const uf = this.favoriteByUser.get(userId) || new Set(); uf.add(nftId); this.favoriteByUser.set(userId, uf);
    const nf = this.favoriteByNft.get(nftId) || new Set(); nf.add(userId); this.favoriteByNft.set(nftId, nf);
    this.scheduleSave(); return f;
  }
  removeFavorite(userId: string, nftId: string): boolean {
    const id = `${userId}-${nftId}`; const removed = this.favorites.delete(id);
    if (removed) { const u = this.favoriteByUser.get(userId); if (u) u.delete(nftId); const n = this.favoriteByNft.get(nftId); if (n) n.delete(userId); this.scheduleSave(); }
    return removed;
  }
  isFavorited(userId: string, nftId: string) { return this.favoriteByUser.get(userId)?.has(nftId) || false; }

  // ─── Signed Messages ──────────────────────────────────
  createSignedMessage(msg: SignedMessage): SignedMessage { this.signedMessages.set(msg.id, msg); this.scheduleSave(); return msg; }
  getSignedMessage(id: string) { return this.signedMessages.get(id); }
  markMessageUsed(id: string) { const m = this.signedMessages.get(id); if (!m) return false; m.used = true; this.scheduleSave(); return true; }

  // ─── Blockchain Index ─────────────────────────────────
  getLastIndexedBlock() { return this.blockchainIndex.get("main")?.lastIndexedBlock || 0; }
  updateLastIndexedBlock(blockNumber: number) {
    this.blockchainIndex.set("main", { id: "main", lastIndexedBlock: blockNumber, lastIndexedAt: new Date().toISOString(), indexerVersion: "1.0.0" });
    this.scheduleSave();
  }

  // ─── Queries ──────────────────────────────────────────
  getAllNfts() { return Array.from(this.nfts.values()); }
  getAllCollections() { return Array.from(this.collections.values()); }
  getAllUsers() { return Array.from(this.users.values()); }
  getAllListings() { return Array.from(this.listings.values()); }
  getActiveListings() { return Array.from(this.activeListings).map((id) => this.listings.get(id)!).filter(Boolean); }
  getAllSales() { return Array.from(this.sales.values()); }
  getAllActivity() { return Array.from(this.activities.values()); }

  getMarketplaceStats() {
    const nfts = this.getAllNfts(); const collections = this.getAllCollections(); const users = this.getAllUsers();
    const sales = this.getAllSales(); const activeListings = this.getActiveListings();
    const totalVolume = sales.reduce((sum, s) => sum + s.price, 0);
    const floorPrice = activeListings.length > 0 ? Math.min(...activeListings.map((l) => l.price)) : 0;
    return {
      totalNfts: nfts.length, totalCollections: collections.length, totalUsers: users.length,
      totalSales: sales.length, totalVolume, floorPrice,
      averageSalePrice: sales.length > 0 ? totalVolume / sales.length : 0,
      activeListings: activeListings.length,
      activeAuctions: Array.from(this.auctions.values()).filter((a) => a.status === "active").length,
    };
  }
}

let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
    if (!storeInstance.loadFromDisk()) {
      seedDemoData(storeInstance);
    }
  }
  return storeInstance;
}

function seedDemoData(store: Store) {
  const { mockUsers, mockCollections } = require("../mock-users");
  const { mockNfts, mockActivities } = require("../mock-nfts");

  for (const user of mockUsers) {
    store.createUser({ id: user.address, address: user.address, name: user.name, avatar: user.avatar, bio: user.bio, joinedAt: user.joinedAt, updatedAt: user.joinedAt });
  }
  for (const col of mockCollections) {
    store.createCollection({
      id: col.id, name: col.name, slug: col.slug, description: col.description, image: col.image, bannerImage: col.bannerImage,
      creatorAddress: col.creator.address, creatorId: col.creator.address, royaltyPercent: 2.5, category: col.category, featured: col.featured,
      createdAt: col.createdAt, updatedAt: col.createdAt, totalItems: col.totalItems, ownersCount: col.ownersCount,
      floorPrice: col.floorPrice * 100_000, totalVolume: col.totalVolume * 100_000,
    });
  }
  for (const nft of mockNfts) {
    store.createNft({
      id: nft.id, tokenId: nft.tokenId, name: nft.name, description: nft.description, image: nft.image,
      attributes: nft.traits.map((t: { type: string; value: string; rarity: number }) => ({ trait_type: t.type, value: t.value })),
      ownerAddress: nft.owner.address, ownerId: nft.owner.address, creatorAddress: nft.creator.address, creatorId: nft.creator.address,
      collectionId: nft.collection.id, mintTxHash: `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
      royaltyPercent: 2.5, price: nft.listed ? nft.price * 100_000 : undefined, listed: nft.listed,
      createdAt: nft.createdAt, updatedAt: nft.createdAt, mintedAt: nft.createdAt,
    });
  }
  for (const a of mockActivities) {
    store.createActivity({
      id: a.id, type: a.type as any, nftId: a.nft.id, collectionId: a.nft.collection.id,
      userAddress: a.from?.address || a.to?.address || "", userId: a.from?.address || a.to?.address || "",
      fromAddress: a.from?.address, toAddress: a.to?.address, price: a.price * 100_000, txHash: a.txHash, createdAt: a.timestamp,
    });
  }
  console.log(`Seeded & saved: ${store.users.size} users, ${store.collections.size} collections, ${store.nfts.size} NFTs`);
}
