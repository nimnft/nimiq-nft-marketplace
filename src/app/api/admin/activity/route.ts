/**
 * Admin Activity Logs API
 *
 * GET /api/admin/activity - Get admin activity logs
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  const { authorized, error } = hasAdminPermission(request, "viewActivity");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const store = getAdminStore();
  const logs = store.getAdminLogs(Math.min(limit, 100));

  return NextResponse.json({ success: true, data: logs });
}
