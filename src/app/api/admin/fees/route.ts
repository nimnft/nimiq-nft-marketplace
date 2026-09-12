/**
 * Admin Fees API
 *
 * GET /api/admin/fees - Get marketplace fee config
 * PUT /api/admin/fees - Update fee config
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  const { authorized, error } = hasAdminPermission(request, "viewFees");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const store = getAdminStore();
  const config = store.getFeeConfig();

  return NextResponse.json({ success: true, data: config });
}

export async function PUT(request: NextRequest) {
  const { authorized, admin, error } = hasAdminPermission(request, "editFees");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const body = await request.json();
  const store = getAdminStore();

  // Validate fee percentages
  if (body.marketplaceFeePercent !== undefined) {
    if (body.marketplaceFeePercent < 0 || body.marketplaceFeePercent > 10) {
      return NextResponse.json(
        { success: false, error: "Marketplace fee must be between 0% and 10%" },
        { status: 400 }
      );
    }
  }

  const updated = store.updateFeeConfig(body, admin!.id);

  store.addAdminLog({
    adminId: admin!.id,
    adminAddress: admin!.address,
    action: "update_fees",
    details: body,
  });

  return NextResponse.json({ success: true, data: updated });
}
