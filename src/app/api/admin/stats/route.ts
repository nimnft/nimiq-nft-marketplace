/**
 * Admin Stats API
 *
 * GET /api/admin/stats - Get dashboard statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  const { authorized, admin, error } = hasAdminPermission(request, "viewDashboard");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const store = getAdminStore();
  const stats = store.getStats();

  return NextResponse.json({ success: true, data: stats });
}
