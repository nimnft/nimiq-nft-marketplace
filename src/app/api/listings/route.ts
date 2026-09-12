/**
 * Listings API Endpoint
 *
 * GET /api/listings - List all active listings
 * POST /api/listings - Create a new listing (requires signed message)
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  isValidNimiqAddress,
  isValidUUID,
  validateLunaAmount,
} from "@/lib/api/validation";
import type { Listing } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const pagination = parsePaginationParams(searchParams);
    const saleType = searchParams.get("saleType");
    const sellerAddress = searchParams.get("sellerAddress");
    const minPrice = searchParams.has("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.has("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;

    let listings = store.getActiveListings();

    // Apply filters
    if (saleType) {
      listings = listings.filter((l) => l.saleType === saleType);
    }

    if (sellerAddress) {
      listings = listings.filter((l) => l.sellerAddress === sellerAddress);
    }

    if (minPrice !== undefined) {
      listings = listings.filter((l) => l.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      listings = listings.filter((l) => l.price <= maxPrice);
    }

    // Sort by price or creation date
    const sortBy = pagination.sortBy === "price" ? "price" : "createdAt";
    listings.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (pagination.sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Paginate
    const total = listings.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedListings = listings.slice(start, start + pagination.limit);

    return paginatedResponse(paginatedListings, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();

    const { nftId, sellerAddress, saleType, price, signedMessageId } = body;

    // Validate required fields
    if (!nftId || !isValidUUID(nftId)) {
      return errorResponse({ statusCode: 400, message: "Valid NFT ID is required" });
    }

    if (!sellerAddress || !isValidNimiqAddress(sellerAddress)) {
      return errorResponse({ statusCode: 400, message: "Valid seller address is required" });
    }

    if (!saleType || !["fixed", "auction"].includes(saleType)) {
      return errorResponse({ statusCode: 400, message: "Sale type must be 'fixed' or 'auction'" });
    }

    if (!signedMessageId) {
      return errorResponse({ statusCode: 400, message: "Signed message ID is required" });
    }

    // Verify signed message
    const signedMessage = store.getSignedMessage(signedMessageId);
    if (!signedMessage || signedMessage.used || signedMessage.address !== sellerAddress) {
      return errorResponse({ statusCode: 400, message: "Invalid or already used signed message" });
    }

    // Verify NFT exists
    const nft = store.getNft(nftId);
    if (!nft) {
      return errorResponse({ statusCode: 404, message: "NFT not found" });
    }

    // Verify seller owns the NFT
    if (nft.ownerAddress !== sellerAddress) {
      return errorResponse({ statusCode: 403, message: "Only the owner can list an NFT for sale" });
    }

    // Check if already listed
    const existingListing = store.getListingByNft(nftId);
    if (existingListing && existingListing.status === "active") {
      return errorResponse({ statusCode: 409, message: "NFT is already listed for sale" });
    }

    // Validate price
    if (!validateLunaAmount(price) || price <= 0) {
      return errorResponse({ statusCode: 400, message: "Price must be a positive integer in Luna" });
    }

    // Get or create user
    let user = store.getUserByAddress(sellerAddress);
    if (!user) {
      user = store.createUser({
        id: sellerAddress,
        address: sellerAddress,
        name: `User ${sellerAddress.slice(0, 10)}`,
        avatar: "",
        bio: "",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Set duration
    const durationDays = body.durationDays || 7;
    const startsAt = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Create listing
    const listingId = crypto.randomUUID();
    const listing: Listing = {
      id: listingId,
      nftId,
      sellerAddress,
      sellerId: user.id,
      saleType: saleType as "fixed" | "auction",
      price,
      startPrice: saleType === "auction" ? price : undefined,
      reservePrice: body.reservePrice,
      startsAt,
      expiresAt: expiresAt.toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.createListing(listing);

    // Update NFT
    store.updateNft(nftId, { listed: true, price });

    // Mark signed message as used
    store.markMessageUsed(signedMessageId);

    // Create activity
    store.createActivity({
      id: crypto.randomUUID(),
      type: "list",
      nftId,
      collectionId: nft.collectionId,
      userAddress: sellerAddress,
      userId: user.id,
      price,
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, data: listing }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
