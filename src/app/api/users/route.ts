/**
 * Users API Endpoint
 *
 * GET /api/users - List users
 * GET /api/users/[address] - Get user by wallet address
 * PUT /api/users/[address] - Update user profile (requires signed message)
 */

import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";
import {
  parsePaginationParams,
  paginatedResponse,
  successResponse,
  errorResponse,
  isValidNimiqAddress,
  cleanNimiqAddress,
  sanitizeString,
} from "@/lib/api/validation";
import type { User } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const { searchParams } = new URL(request.url);

    const pagination = parsePaginationParams(searchParams);
    const search = searchParams.get("search");

    let users = store.getAllUsers();

    // Apply search filter
    if (search) {
      const query = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.address.toLowerCase().includes(query),
      );
    }

    // Sort by join date
    users.sort((a, b) => {
      if (pagination.sortOrder === "asc") {
        return a.joinedAt > b.joinedAt ? 1 : -1;
      }
      return a.joinedAt < b.joinedAt ? 1 : -1;
    });

    // Paginate
    const total = users.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedUsers = users.slice(start, start + pagination.limit);

    return paginatedResponse(paginatedUsers, total, pagination.page, pagination.limit);
  } catch (error) {
    return errorResponse(error);
  }
}
