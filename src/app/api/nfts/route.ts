/**
 * NFTs API Endpoint
 *
 * GET /api/nfts - List all NFTs with filtering and pagination
 * POST /api/nfts - Create a new NFT (requires signed message)
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  isValidNimiqAddress,
  isValidUUID,
  sanitizeSearchQuery,
} from "@/lib/api/validation";
import type { Nft, NftFilterParams } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const pagination = parsePaginationParams(searchParams);
    const filters: NftFilterParams = {
      ...pagination,
      collectionId: searchParams.get("collectionId") || undefined,
      ownerAddress: searchParams.get("ownerAddress") || undefined,
      creatorAddress: searchParams.get("creatorAddress") || undefined,
      minPrice: searchParams.has("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.has("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
      listed: searchParams.has("listed") ? searchParams.get("listed") === "true" : undefined,
      search: searchParams.get("search") ? sanitizeSearchQuery(searchParams.get("search")!) : undefined,
    };

    let nfts = store.getAllNfts();

    // Apply filters
    if (filters.collectionId) {
      nfts = nfts.filter((n) => n.collectionId === filters.collectionId);
    }

    if (filters.ownerAddress) {
      nfts = nfts.filter((n) => n.ownerAddress === filters.ownerAddress);
    }

    if (filters.creatorAddress) {
      nfts = nfts.filter((n) => n.creatorAddress === filters.creatorAddress);
    }

    if (filters.minPrice !== undefined) {
      nfts = nfts.filter((n) => n.price !== undefined && n.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      nfts = nfts.filter((n) => n.price !== undefined && n.price <= filters.maxPrice!);
    }

    if (filters.listed !== undefined) {
      nfts = nfts.filter((n) => n.listed === filters.listed);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      nfts = nfts.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.description.toLowerCase().includes(query),
      );
    }

    // Sort
    nfts.sort((a, b) => {
      const aVal = a[pagination.sortBy as keyof Nft] ?? "";
      const bVal = b[pagination.sortBy as keyof Nft] ?? "";

      if (pagination.sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Paginate
    const total = nfts.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedNfts = nfts.slice(start, start + pagination.limit);

    return paginatedResponse(paginatedNfts, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();

    // Validate required fields
    const { name, description, image, collectionId, creatorAddress, signedMessageId } = body;

    if (!name || typeof name !== "string") {
      return errorResponse({ statusCode: 400, message: "Name is required" });
    }

    if (!image || typeof image !== "string") {
      return errorResponse({ statusCode: 400, message: "Image is required" });
    }

    if (!collectionId || !isValidUUID(collectionId)) {
      return errorResponse({ statusCode: 400, message: "Valid collection ID is required" });
    }

    if (!creatorAddress || !isValidNimiqAddress(creatorAddress)) {
      return errorResponse({ statusCode: 400, message: "Valid creator address is required" });
    }

    if (!signedMessageId) {
      return errorResponse({ statusCode: 400, message: "Signed message ID is required" });
    }

    // Verify signed message
    const signedMessage = store.getSignedMessage(signedMessageId);
    if (!signedMessage || signedMessage.used || signedMessage.address !== creatorAddress) {
      return errorResponse({ statusCode: 400, message: "Invalid or already used signed message" });
    }

    // Verify collection exists
    const collection = store.getCollection(collectionId);
    if (!collection) {
      return errorResponse({ statusCode: 404, message: "Collection not found" });
    }

    // Verify creator owns the collection
    if (collection.creatorAddress !== creatorAddress) {
      return errorResponse({ statusCode: 403, message: "Only collection creator can mint NFTs" });
    }

    // Get or create user
    let user = store.getUserByAddress(creatorAddress);
    if (!user) {
      user = store.createUser({
        id: creatorAddress,
        address: creatorAddress,
        name: `User ${creatorAddress.slice(0, 10)}`,
        avatar: "",
        bio: "",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Generate token ID
    const collectionNfts = store.getNftsByCollection(collectionId);
    const tokenId = String(collectionNfts.length + 1).padStart(6, "0");

    // Create NFT
    const nftId = crypto.randomUUID();
    const nft: Nft = {
      id: nftId,
      tokenId,
      name: name.slice(0, 100),
      description: (description || "").slice(0, 2000),
      image,
      externalUrl: body.externalUrl,
      attributes: Array.isArray(body.attributes) ? body.attributes.slice(0, 20) : [],
      ownerAddress: creatorAddress,
      ownerId: user.id,
      creatorAddress,
      creatorId: user.id,
      collectionId,
      mintTxHash: "", // Will be filled by indexer
      royaltyPercent: collection.royaltyPercent,
      listed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mintedAt: new Date().toISOString(),
    };

    store.createNft(nft);

    // Mark signed message as used
    store.markMessageUsed(signedMessageId);

    // Create activity
    store.createActivity({
      id: crypto.randomUUID(),
      type: "mint",
      nftId: nft.id,
      collectionId,
      userAddress: creatorAddress,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, data: nft }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
