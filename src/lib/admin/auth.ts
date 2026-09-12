/**
 * Admin Authentication Middleware
 *
 * Server-side admin authentication and authorization.
 * Admin functionality is completely hidden from non-admin users.
 */

import { NextRequest } from "next/server";
import { getAdminStore } from "./store";
import type { AdminUser, AdminPermissions } from "@/types/admin";

const ADMIN_SESSION_COOKIE = "nimiq-admin-session";

/**
 * Get admin from request.
 * Returns null if not authenticated as admin.
 */
export function getAdminFromRequest(request: NextRequest): AdminUser | null {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  // In production: validate JWT/session token
  // For now: extract address from token format "admin_{address}_{timestamp}"
  try {
    const parts = sessionToken.split("_");
    if (parts.length < 2) return null;

    const address = parts[1];
    const store = getAdminStore();
    return store.getAdminByAddress(address) || null;
  } catch {
    return null;
  }
}

/**
 * Check if request has a specific admin permission.
 */
export function hasAdminPermission(
  request: NextRequest,
  permission: keyof AdminPermissions
): { authorized: boolean; admin?: AdminUser; error?: string } {
  const admin = getAdminFromRequest(request);

  if (!admin) {
    return { authorized: false, error: "Not authenticated as admin" };
  }

  if (!admin.isActive) {
    return { authorized: false, error: "Admin account is deactivated" };
  }

  if (!admin.permissions[permission]) {
    return { authorized: false, admin, error: "Insufficient permissions" };
  }

  return { authorized: true, admin };
}

/**
 * Verify admin session is valid.
 */
export function verifyAdminSession(request: NextRequest): {
  valid: boolean;
  admin?: AdminUser;
  error?: string;
} {
  const admin = getAdminFromRequest(request);

  if (!admin) {
    return { valid: false, error: "Invalid or missing admin session" };
  }

  if (!admin.isActive) {
    return { valid: false, error: "Admin account is deactivated" };
  }

  return { valid: true, admin };
}

export { ADMIN_SESSION_COOKIE };
