/**
 * Collections API Endpoint
 *
 * GET /api/collections - List all collections with filtering
 * POST /api/collections - Create a new collection (requires signed message)
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  isValidNimiqAddress,
  isValidSlug,
  sanitizeString,
  sanitizeSearchQuery,
} from "@/lib/api/validation";
import type { Collection, CollectionFilterParams } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const pagination = parsePaginationParams(searchParams);
    const filters: CollectionFilterParams = {
      ...pagination,
      category: searchParams.get("category") || undefined,
      featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
      creatorAddress: searchParams.get("creatorAddress") || undefined,
      search: searchParams.get("search") ? sanitizeSearchQuery(searchParams.get("search")!) : undefined,
    };

    let collections = store.getAllCollections();

    // Apply filters
    if (filters.category) {
      collections = collections.filter((c) => c.category === filters.category);
    }

    if (filters.featured !== undefined) {
      collections = collections.filter((c) => c.featured === filters.featured);
    }

    if (filters.creatorAddress) {
      collections = collections.filter((c) => c.creatorAddress === filters.creatorAddress);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      collections = collections.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query),
      );
    }

    // Sort
    collections.sort((a, b) => {
      const aVal = a[pagination.sortBy as keyof Collection] ?? "";
      const bVal = b[pagination.sortBy as keyof Collection] ?? "";

      if (pagination.sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Paginate
    const total = collections.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedCollections = collections.slice(start, start + pagination.limit);

    return paginatedResponse(paginatedCollections, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();

    const { name, slug, description, image, bannerImage, creatorAddress, signedMessageId } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return errorResponse({ statusCode: 400, message: "Name is required" });
    }

    if (!slug || !isValidSlug(slug)) {
      return errorResponse({ statusCode: 400, message: "Valid slug is required (3-100 chars, lowercase alphanumeric with hyphens)" });
    }

    if (!image || typeof image !== "string") {
      return errorResponse({ statusCode: 400, message: "Image is required" });
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

    // Check slug uniqueness
    if (store.getCollectionBySlug(slug)) {
      return errorResponse({ statusCode: 409, message: "Collection slug already exists" });
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

    // Validate royalty
    const royaltyPercent = body.royaltyPercent ?? 2.5;
    if (royaltyPercent < 0 || royaltyPercent > 10) {
      return errorResponse({ statusCode: 400, message: "Royalty must be between 0% and 10%" });
    }

    // Create collection
    const collectionId = crypto.randomUUID();
    const collection: Collection = {
      id: collectionId,
      name: sanitizeString(name, 100),
      slug,
      description: sanitizeString(description || "", 2000),
      image,
      bannerImage: bannerImage || image,
      creatorAddress,
      creatorId: user.id,
      royaltyPercent,
      maxSupply: body.maxSupply || undefined,
      category: body.category || "uncategorized",
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalItems: 0,
      ownersCount: 0,
      floorPrice: 0,
      totalVolume: 0,
    };

    store.createCollection(collection);

    // Mark signed message as used
    store.markMessageUsed(signedMessageId);

    // Create activity
    store.createActivity({
      id: crypto.randomUUID(),
      type: "mint",
      collectionId,
      userAddress: creatorAddress,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, data: collection }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
