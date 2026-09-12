/**
 * Search API Endpoint
 *
 * GET /api/search - Search across NFTs, collections, and users
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  sanitizeSearchQuery,
} from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    if (!query || query.trim().length === 0) {
      return errorResponse({ statusCode: 400, message: "Search query is required" });
    }

    const sanitizedQuery = sanitizeSearchQuery(query);
    if (sanitizedQuery.length < 2) {
      return errorResponse({ statusCode: 400, message: "Search query must be at least 2 characters" });
    }

    const type = searchParams.get("type") || "all"; // "nfts", "collections", "users", "all"
    const pagination = parsePaginationParams(searchParams);

    const results: {
      nfts: unknown[];
      collections: unknown[];
      users: unknown[];
    } = {
      nfts: [],
      collections: [],
      users: [],
    };

    let total = 0;

    // Search NFTs
    if (type === "all" || type === "nfts") {
      const nfts = store.getAllNfts();
      const filtered = nfts.filter(
        (n) =>
          n.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          n.description.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          n.tokenId.includes(sanitizedQuery),
      );
      results.nfts = filtered;
      total += filtered.length;
    }

    // Search Collections
    if (type === "all" || type === "collections") {
      const collections = store.getAllCollections();
      const filtered = collections.filter(
        (c) =>
          c.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          c.slug.includes(sanitizedQuery.toLowerCase()),
      );
      results.collections = filtered;
      total += filtered.length;
    }

    // Search Users
    if (type === "all" || type === "users") {
      const users = store.getAllUsers();
      const filtered = users.filter(
        (u) =>
          u.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          u.address.toLowerCase().includes(sanitizedQuery.toLowerCase()),
      );
      results.users = filtered;
      total += filtered.length;
    }

    // Sort results by relevance (exact match > starts with > contains)
    const queryLower = sanitizedQuery.toLowerCase();

    const sortResults = <T extends { name?: string; address?: string; tokenId?: string }>(
      items: T[],
    ): T[] => {
      return items.sort((a, b) => {
        const aName = (a.name || a.address || a.tokenId || "").toLowerCase();
        const bName = (b.name || b.address || b.tokenId || "").toLowerCase();

        // Exact match
        if (aName === queryLower && bName !== queryLower) return -1;
        if (bName === queryLower && aName !== queryLower) return 1;

        // Starts with
        if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1;
        if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1;

        return 0;
      });
    };

    results.nfts = sortResults(results.nfts as { name?: string }[]);
    results.collections = sortResults(results.collections as { name?: string }[]);
    results.users = sortResults(results.users as { name?: string; address?: string }[]);

    // Apply pagination to combined results
    const allResults = [
      ...results.nfts.map((n) => ({ type: "nft", data: n })),
      ...results.collections.map((c) => ({ type: "collection", data: c })),
      ...results.users.map((u) => ({ type: "user", data: u })),
    ];

    const start = (pagination.page - 1) * pagination.limit;
    const paginatedResults = allResults.slice(start, start + pagination.limit);

    return paginatedResponse(paginatedResults, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}
