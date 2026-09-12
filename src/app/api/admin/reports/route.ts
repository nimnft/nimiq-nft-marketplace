/**
 * Admin Reports API
 *
 * GET /api/admin/reports - List all reports
 * PUT /api/admin/reports/[id] - Handle a report
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  const { authorized, error } = hasAdminPermission(request, "viewReports");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "pending" | "reviewed" | "resolved" | "dismissed" | null;

  const store = getAdminStore();
  const reports = store.getReports(status || undefined);

  return NextResponse.json({ success: true, data: reports });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { authorized, admin, error } = hasAdminPermission(request, "handleReports");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const { id } = await context.params;
  const body = await request.json();
  const store = getAdminStore();

  const report = store.getReport(id);
  if (!report) {
    return NextResponse.json(
      { success: false, error: "Report not found" },
      { status: 404 }
    );
  }

  const updated = store.updateReport(id, {
    status: body.status,
    handledBy: admin!.id,
    handledAt: new Date().toISOString(),
  });

  store.addAdminLog({
    adminId: admin!.id,
    adminAddress: admin!.address,
    action: "handle_report",
    targetType: report.targetType,
    targetId: report.targetId,
    details: { status: body.status },
  });

  return NextResponse.json({ success: true, data: updated });
}
