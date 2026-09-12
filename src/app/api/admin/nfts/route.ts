/**
 * Admin NFTs API
 *
 * GET /api/admin/nfts - List all NFTs for management
 * PUT /api/admin/nfts/[id] - Update NFT (feature/unfeature)
 * DELETE /api/admin/nfts/[id] - Delete NFT
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";
import { getStore } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const { authorized, error } = hasAdminPermission(request, "viewNfts");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const store = getStore();
  const adminStore = getAdminStore();
  const featuredNfts = adminStore.getFeaturedNfts();

  const nfts = Array.from(store.nfts.values()).map((nft) => ({
    ...nft,
    isFeatured: featuredNfts.includes(nft.id),
  }));

  return NextResponse.json({ success: true, data: nfts });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { authorized, admin, error } = hasAdminPermission(request, "editNfts");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const { id } = await context.params;
  const body = await request.json();
  const store = getStore();
  const adminStore = getAdminStore();

  const nft = store.getNft(id);
  if (!nft) {
    return NextResponse.json(
      { success: false, error: "NFT not found" },
      { status: 404 }
    );
  }

  // Handle feature toggle
  if (body.feature !== undefined) {
    if (!admin?.permissions.featureNfts) {
      return NextResponse.json(
        { success: false, error: "No permission to feature NFTs" },
        { status: 403 }
      );
    }

    const isNowFeatured = adminStore.toggleFeaturedNft(id);
    adminStore.addAdminLog({
      adminId: admin!.id,
      adminAddress: admin!.address,
      action: isNowFeatured ? "feature_nft" : "unfeature_nft",
      targetType: "nft",
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      data: { featured: isNowFeatured },
    });
  }

  return NextResponse.json({ success: true, data: nft });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { authorized, admin, error } = hasAdminPermission(request, "deleteNfts");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const { id } = await context.params;
  const store = getStore();

  const nft = store.getNft(id);
  if (!nft) {
    return NextResponse.json(
      { success: false, error: "NFT not found" },
      { status: 404 }
    );
  }

  // In production: soft delete or archive
  return NextResponse.json({ success: true, data: { deleted: id } });
}
