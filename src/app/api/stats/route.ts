/**
 * Statistics API Endpoint
 *
 * GET /api/stats - Get marketplace statistics
 * GET /api/stats/collection/[id] - Get collection statistics
 * GET /api/stats/user/[address] - Get user statistics
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import { successResponse, errorResponse, isValidNimiqAddress, cleanNimiqAddress } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const stats = store.getMarketplaceStats();

    return successResponse(stats);
  } catch (error) {
    return errorResponse(error);
  }
}

// Collection stats
export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();

    if (body.type === "collection" && body.collectionId) {
      const collection = store.getCollection(body.collectionId);
      if (!collection) {
        return errorResponse({ statusCode: 404, message: "Collection not found" });
      }

      const nfts = store.getNftsByCollection(body.collectionId);
      const listings = store.getActiveListings().filter((l) => {
        const nft = store.getNft(l.nftId);
        return nft?.collectionId === body.collectionId;
      });

      const sales = store.getAllSales().filter((s) => {
        const nft = store.getNft(s.nftId);
        return nft?.collectionId === body.collectionId;
      });

      const owners = new Set(nfts.map((n) => n.ownerAddress));

      const stats = {
        collectionId: body.collectionId,
        totalItems: nfts.length,
        ownersCount: owners.size,
        floorPrice: listings.length > 0 ? Math.min(...listings.map((l) => l.price)) : 0,
        totalVolume: sales.reduce((sum, s) => sum + s.price, 0),
        averagePrice: sales.length > 0 ? sales.reduce((sum, s) => sum + s.price, 0) / sales.length : 0,
        highestSale: sales.length > 0 ? Math.max(...sales.map((s) => s.price)) : 0,
        activeListings: listings.length,
      };

      return successResponse(stats);
    }

    if (body.type === "user" && body.address) {
      if (!isValidNimiqAddress(body.address)) {
        return errorResponse({ statusCode: 400, message: "Invalid Nimiq address" });
      }

      const address = cleanNimiqAddress(body.address);
      const ownedNfts = store.getNftsByOwner(address);
      const createdNfts = store.getNftsByCreator(address);

      const sales = store.getAllSales().filter(
        (s) => s.buyerAddress === address || s.sellerAddress === address,
      );

      const stats = {
        userId: address,
        totalOwned: ownedNfts.length,
        totalCreated: createdNfts.length,
        totalSold: sales.filter((s) => s.sellerAddress === address).length,
        totalBought: sales.filter((s) => s.buyerAddress === address).length,
        totalVolume: sales.reduce((sum, s) => sum + s.price, 0),
        totalEarnings: sales
          .filter((s) => s.sellerAddress === address)
          .reduce((sum, s) => sum + s.price - s.marketplaceFee - s.creatorRoyalty, 0),
      };

      return successResponse(stats);
    }

    return errorResponse({ statusCode: 400, message: "Invalid stats type" });
  } catch (error) {
    return errorResponse(error);
  }
}
