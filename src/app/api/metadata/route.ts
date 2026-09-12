/**
 * Metadata Upload API Endpoint
 *
 * POST /api/metadata - Upload NFT metadata to decentralized storage
 *
 * Server-side only operation - API keys are never exposed to frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadMetadata, validateMetadata } from "@/lib/metadata/service";
import { getDefaultProvider, validateStorageConfig } from "@/lib/metadata/config";
import type { NftMetadata } from "@/types/metadata";

export async function POST(request: NextRequest) {
  try {
    // Check storage configuration
    const provider = getDefaultProvider();
    const configStatus = validateStorageConfig(provider);

    if (!configStatus.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage provider not configured. Missing: ${configStatus.missing.join(", ")}`,
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { metadata, name, nftId, collectionId } = body as {
      metadata: Omit<NftMetadata, "schema_version" | "created_at">;
      name?: string;
      nftId?: string;
      collectionId?: string;
    };

    // Validate metadata
    if (!metadata) {
      return NextResponse.json(
        { success: false, error: "No metadata provided" },
        { status: 400 }
      );
    }

    const validation = validateMetadata(metadata);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid metadata",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Upload metadata to decentralized storage
    const result = await uploadMetadata(metadata, {
      name,
      nftId,
      collectionId,
      provider,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        warnings: validation.warnings,
      },
    });
  } catch (error) {
    console.error("Metadata upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
