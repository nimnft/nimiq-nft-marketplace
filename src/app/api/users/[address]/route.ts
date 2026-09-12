/**
 * User Detail API Endpoint
 *
 * GET /api/users/[address] - Get user by wallet address
 * PUT /api/users/[address] - Update user profile (requires signed message)
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  successResponse,
  errorResponse,
  isValidNimiqAddress,
  cleanNimiqAddress,
  sanitizeString,
} from "@/lib/api/validation";
import type { User } from "@/lib/db/schema";

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const store = getStore();
    const { address } = await params;

    if (!isValidNimiqAddress(address)) {
      return errorResponse({ statusCode: 400, message: "Invalid Nimiq address" });
    }

    const cleanAddress = cleanNimiqAddress(address);
    const user = store.getUserByAddress(cleanAddress);

    if (!user) {
      return errorResponse({ statusCode: 404, message: "User not found" });
    }

    // Get user's NFTs
    const ownedNfts = store.getNftsByOwner(cleanAddress);
    const createdNfts = store.getNftsByCreator(cleanAddress);
    const collections = store.getAllCollections().filter((c) => c.creatorAddress === cleanAddress);

    return successResponse({
      ...user,
      stats: {
        totalOwned: ownedNfts.length,
        totalCreated: createdNfts.length,
        totalCollections: collections.length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const store = getStore();
    const { address } = await params;

    if (!isValidNimiqAddress(address)) {
      return errorResponse({ statusCode: 400, message: "Invalid Nimiq address" });
    }

    const cleanAddress = cleanNimiqAddress(address);
    const body = await request.json();
    const { signedMessageId } = body;

    if (!signedMessageId) {
      return errorResponse({ statusCode: 400, message: "Signed message ID is required" });
    }

    // Verify signed message
    const signedMessage = store.getSignedMessage(signedMessageId);
    if (!signedMessage || signedMessage.used || signedMessage.address !== cleanAddress) {
      return errorResponse({ statusCode: 400, message: "Invalid or already used signed message" });
    }

    // Get existing user or create
    let user = store.getUserByAddress(cleanAddress);
    if (!user) {
      user = store.createUser({
        id: cleanAddress,
        address: cleanAddress,
        name: `User ${cleanAddress.slice(0, 10)}`,
        avatar: "",
        bio: "",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Update fields
    const updates: Partial<User> = {};
    if (body.name !== undefined) updates.name = sanitizeString(body.name, 50);
    if (body.avatar !== undefined) updates.avatar = sanitizeString(body.avatar, 500);
    if (body.bio !== undefined) updates.bio = sanitizeString(body.bio, 500);
    if (body.website !== undefined) updates.website = sanitizeString(body.website, 200);
    if (body.twitter !== undefined) updates.twitter = sanitizeString(body.twitter, 100);
    if (body.discord !== undefined) updates.discord = sanitizeString(body.discord, 100);

    const updatedUser = store.updateUser(user.id, updates);

    // Mark signed message as used
    store.markMessageUsed(signedMessageId);

    return successResponse(updatedUser);
  } catch (error) {
    return errorResponse(error);
  }
}
