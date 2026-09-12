/**
 * Media Upload API Endpoint
 *
 * POST /api/metadata/media - Upload media file to decentralized storage
 *
 * Server-side only operation - API keys are never exposed to frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadMedia, validateMedia } from "@/lib/metadata/service";
import { getDefaultProvider, validateStorageConfig } from "@/lib/metadata/config";
import type { MediaType } from "@/types/metadata";

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mediaType = formData.get("mediaType") as MediaType | null;
    const name = formData.get("name") as string | null;
    const nftId = formData.get("nftId") as string | null;
    const collectionId = formData.get("collectionId") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!mediaType || !["image", "video", "audio", "animation"].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: "Invalid media type. Must be: image, video, audio, or animation" },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateMedia(file, mediaType);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload to decentralized storage
    const result = await uploadMedia(file, mediaType, {
      name: name || file.name,
      nftId: nftId || undefined,
      collectionId: collectionId || undefined,
      provider,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Media upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

// Configure body size limit for large files
export const config = {
  api: {
    bodyParser: false,
  },
};
