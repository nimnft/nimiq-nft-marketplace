import type { NFT, Activity, Collection } from "@/types";

const API_BASE = "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchNFTs(address?: string): Promise<NFT[]> {
  const params = address ? `?address=${encodeURIComponent(address)}` : "";
  const res = await apiFetch<{ data: NFT[] }>(`/api/user/nfts${params}`);
  return res.data || [];
}

export async function fetchCollections(address?: string): Promise<Collection[]> {
  const params = address ? `?address=${encodeURIComponent(address)}` : "";
  const res = await apiFetch<{ data: Collection[] }>(`/api/user/collections${params}`);
  return res.data || [];
}

export async function fetchActivity(address?: string): Promise<Activity[]> {
  const params = address ? `?address=${encodeURIComponent(address)}` : "";
  const res = await apiFetch<{ data: Activity[] }>(`/api/user/activity${params}`);
  return res.data || [];
}

export async function createCollectionAPI(data: {
  name: string; description?: string; image?: string; category?: string; creatorAddress: string;
}): Promise<Collection> {
  const res = await apiFetch<{ data: Collection }>("/api/user/collections", {
    method: "POST", body: JSON.stringify(data),
  });
  return res.data;
}

export async function createNFTAPI(data: {
  name: string; description?: string; image?: string; collectionId?: string;
  creatorAddress: string; royalty?: number; txHash?: string; attributes?: { trait_type: string; value: string }[];
}): Promise<NFT> {
  const res = await apiFetch<{ data: NFT }>("/api/user/nfts", {
    method: "POST", body: JSON.stringify(data),
  });
  return res.data;
}

export async function createActivityAPI(data: {
  type: string; nftId?: string; collectionId?: string;
  userAddress: string; fromAddress?: string; toAddress?: string;
  price?: number; txHash?: string;
}): Promise<void> {
  await apiFetch("/api/user/activity", {
    method: "POST", body: JSON.stringify(data),
  });
}
