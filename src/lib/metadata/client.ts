/**
 * Client-side Metadata Utilities
 *
 * Safe for browser use. Calls server-side API endpoints.
 * API keys are NEVER exposed to the frontend.
 */

import type {
  MediaType,
  NftMetadata,
  MediaUploadResponse,
  NftAttribute,
} from "@/types/metadata";
import { MEDIA_CONFIGS } from "@/types/metadata";

// ============================================================
// Client-side Types
// ============================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: UploadProgress | null;
  result: MediaUploadResponse | null;
  error: string | null;
}

// ============================================================
// IPFS Utilities
// ============================================================

/**
 * Check if a URI is an IPFS URI
 */
export function isIpfsUri(uri: string): boolean {
  return uri.startsWith("ipfs://");
}

/**
 * Convert IPFS URI to gateway URL
 */
export function ipfsToGatewayUrl(
  uri: string,
  gateway: string = "https://gateway.pinata.cloud/ipfs"
): string {
  if (!uri.startsWith("ipfs://")) {
    return uri;
  }
  const cid = uri.replace("ipfs://", "").split("/")[0];
  return `${gateway}/${cid}`;
}

/**
 * Extract CID from IPFS URI
 */
export function extractCidFromUri(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "").split("/")[0];
  }
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Build IPFS URI from CID
 */
export function cidToIpfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

// ============================================================
// File Utilities
// ============================================================

/**
 * Get media type from file MIME type
 */
export function getMediaTypeFromFile(file: File): MediaType | null {
  const mime = file.type;

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  // Check for animation (GIF, JSON for Lottie)
  if (mime === "image/gif") return "animation";
  if (mime === "application/json") return "animation";

  return null;
}

/**
 * Check if file is accepted for a media type
 */
export function isFileAccepted(file: File, mediaType: MediaType): boolean {
  const config = MEDIA_CONFIGS[mediaType];
  return config.acceptedTypes.includes(file.type as any);
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Create a preview URL for a file
 */
export function createFilePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL
 */
export function revokeFilePreview(url: string): void {
  URL.revokeObjectURL(url);
}

// ============================================================
// Upload Functions (Client-side)
// ============================================================

/**
 * Upload media file via server-side API
 *
 * @param file - File to upload
 * @param mediaType - Type of media
 * @param onProgress - Progress callback
 * @param options - Additional options
 * @returns Upload response
 */
export async function uploadMediaToApi(
  file: File,
  mediaType: MediaType,
  onProgress?: (progress: UploadProgress) => void,
  options?: {
    name?: string;
    nftId?: string;
    collectionId?: string;
  }
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mediaType", mediaType);
  if (options?.name) formData.append("name", options.name);
  if (options?.nftId) formData.append("nftId", options.nftId);
  if (options?.collectionId) formData.append("collectionId", options.collectionId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || "Upload failed"));
        }
      } catch {
        reject(new Error("Invalid response from server"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("POST", "/api/metadata/media");
    xhr.send(formData);
  });
}

/**
 * Upload NFT metadata via server-side API
 */
export async function uploadMetadataToApi(
  metadata: Omit<NftMetadata, "schema_version" | "created_at">,
  options?: {
    name?: string;
    nftId?: string;
    collectionId?: string;
  }
): Promise<{ uri: string; cid: string; gatewayUrl: string }> {
  const response = await fetch("/api/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata, ...options }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Metadata upload failed");
  }

  return data.data;
}

/**
 * Retrieve metadata via server-side API
 */
export async function getMetadataFromApi(
  cid: string
): Promise<{ metadata: NftMetadata; gatewayUrl: string }> {
  const response = await fetch(`/api/metadata/${cid}`);

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Metadata retrieval failed");
  }

  return data.data;
}

// ============================================================
// Metadata Builder Utilities
// ============================================================

/**
 * Create a new attribute
 */
export function createAttribute(
  traitType: string,
  value: string | number,
  displayType?: NftAttribute["display_type"]
): NftAttribute {
  return {
    trait_type: traitType,
    value,
    display_type: displayType,
  };
}

/**
 * Build NFT metadata from form data
 */
export function buildNftMetadata(params: {
  name: string;
  description: string;
  imageUri: string;
  externalUrl?: string;
  animationUri?: string;
  backgroundColor?: string;
  attributes: NftAttribute[];
  creatorAddress: string;
  creatorName?: string;
  creatorAvatar?: string;
  collectionId?: string;
  collectionName?: string;
  collectionSlug?: string;
  media?: NftMetadata["media"];
}): Omit<NftMetadata, "schema_version" | "created_at"> {
  return {
    name: params.name,
    description: params.description,
    image: params.imageUri,
    external_url: params.externalUrl,
    animation_url: params.animationUri,
    background_color: params.backgroundColor,
    attributes: params.attributes,
    creator: {
      address: params.creatorAddress,
      name: params.creatorName,
      avatar: params.creatorAvatar,
    },
    collection: params.collectionId
      ? {
          id: params.collectionId,
          name: params.collectionName || "",
          slug: params.collectionSlug || "",
        }
      : undefined,
    media: params.media,
  };
}

/**
 * Validate metadata on client side (basic validation)
 */
export function validateMetadataClient(metadata: Partial<NftMetadata>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.name?.trim()) {
    errors.push("Name is required");
  }

  if (!metadata.description?.trim()) {
    errors.push("Description is required");
  }

  if (!metadata.image) {
    errors.push("Image is required");
  }

  if (metadata.external_url && !isValidUrl(metadata.external_url)) {
    errors.push("Invalid external URL");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
