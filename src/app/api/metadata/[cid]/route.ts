/**
 * Metadata Retrieval API Endpoint
 *
 * GET /api/metadata/[cid] - Retrieve NFT metadata from IPFS
 */

import { NextRequest, NextResponse } from "next/server";
import { getMetadata, getGatewayUrl } from "@/lib/metadata/service";
import type { MetadataValidationResult } from "@/types/metadata";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as "pinata" | "web3.storage" | "nft.storage" | "local" | null;

    if (!cid) {
      return NextResponse.json(
        { success: false, error: "CID is required" },
        { status: 400 }
      );
    }

    // Build the URI
    const uri = cid.startsWith("ipfs://") ? cid : `ipfs://${cid}`;

    // Retrieve metadata
    const metadata = await getMetadata(uri, provider || undefined);

    return NextResponse.json({
      success: true,
      data: {
        metadata,
        gatewayUrl: getGatewayUrl(cid, provider || undefined),
      },
    });
  } catch (error) {
    console.error("Metadata retrieval error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Retrieval failed",
      },
      { status: 500 }
    );
  }
}
