/**
 * Activity API Endpoint
 *
 * GET /api/activity - List all activity with filtering
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  isValidNimiqAddress,
  cleanNimiqAddress,
} from "@/lib/api/validation";
import type { Activity, ActivityType } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const pagination = parsePaginationParams(searchParams);
    const nftId = searchParams.get("nftId");
    const collectionId = searchParams.get("collectionId");
    const userAddress = searchParams.get("userAddress");
    const type = searchParams.get("type") as ActivityType | null;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let activities = store.getAllActivity();

    // Apply filters
    if (nftId) {
      activities = activities.filter((a) => a.nftId === nftId);
    }

    if (collectionId) {
      activities = activities.filter((a) => a.collectionId === collectionId);
    }

    if (userAddress && isValidNimiqAddress(userAddress)) {
      const cleanAddress = cleanNimiqAddress(userAddress);
      activities = activities.filter(
        (a) =>
          a.userAddress === cleanAddress ||
          a.fromAddress === cleanAddress ||
          a.toAddress === cleanAddress,
      );
    }

    if (type) {
      activities = activities.filter((a) => a.type === type);
    }

    if (from) {
      activities = activities.filter((a) => a.createdAt >= from);
    }

    if (to) {
      activities = activities.filter((a) => a.createdAt <= to);
    }

    // Sort by date (newest first by default)
    activities.sort((a, b) => {
      if (pagination.sortOrder === "asc") {
        return a.createdAt > b.createdAt ? 1 : -1;
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });

    // Paginate
    const total = activities.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedActivities = activities.slice(start, start + pagination.limit);

    // Enrich with NFT data
    const enrichedActivities = paginatedActivities.map((activity) => {
      const nft = activity.nftId ? store.getNft(activity.nftId) : undefined;
      const user = store.getUserByAddress(activity.userAddress);

      return {
        ...activity,
        nft: nft
          ? {
              id: nft.id,
              name: nft.name,
              image: nft.image,
              tokenId: nft.tokenId,
            }
          : undefined,
        user: user
          ? {
              address: user.address,
              name: user.name,
              avatar: user.avatar,
            }
          : undefined,
      };
    });

    return paginatedResponse(enrichedActivities, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}
