/**
 * Admin Collections API
 *
 * GET /api/admin/collections - List all collections
 * PUT /api/admin/collections/[id] - Update collection (feature/unfeature)
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/admin/store";
import { getStore } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const { authorized, error } = hasAdminPermission(request, "viewCollections");

  if (!authorized) {
    return NextResponse.json(
      { success: false, error },
      { status: error === "Not authenticated as admin" ? 401 : 403 }
    );
  }

  const store = getStore();
  const adminStore = getAdminStore();
  const featuredCollections = adminStore.getFeaturedCollections();

  const collections = Array.from(store.collections.values()).map((col) => ({
    ...col,
    isFeatured: featuredCollections.includes(col.id),
  }));

  return NextResponse.json({ success: true, data: collections });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { authorized, admin, error } = hasAdminPermission(request, "editCollections");

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

  const collection = store.getCollection(id);
  if (!collection) {
    return NextResponse.json(
      { success: false, error: "Collection not found" },
      { status: 404 }
    );
  }

  if (body.feature !== undefined) {
    if (!admin?.permissions.featureCollections) {
      return NextResponse.json(
        { success: false, error: "No permission to feature collections" },
        { status: 403 }
      );
    }

    const isNowFeatured = adminStore.toggleFeaturedCollection(id);
    adminStore.addAdminLog({
      adminId: admin!.id,
      adminAddress: admin!.address,
      action: isNowFeatured ? "feature_collection" : "unfeature_collection",
      targetType: "collection",
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      data: { featured: isNowFeatured },
    });
  }

  return NextResponse.json({ success: true, data: collection });
}
