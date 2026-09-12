/**
 * Metadata Upload Service
 *
 * Server-side only! Handles media and metadata uploads to decentralized storage.
 * API keys are NEVER exposed to the frontend.
 */

import type {
  MediaType,
  MediaFormat,
  NftMetadata,
  UploadResponse,
  MediaUploadResponse,
  StorageProviderConfig,
  MetadataValidationResult,
  NftAttribute,
} from "@/types/metadata";
import { MEDIA_CONFIGS } from "@/types/metadata";
import {
  getStorageConfig,
  getDefaultProvider,
  validateStorageConfig,
  type StorageProvider,
} from "./config";

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validate metadata against schema
 */
export function validateMetadata(metadata: Partial<NftMetadata>): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push("Name is required");
  } else if (metadata.name.length > 100) {
    errors.push("Name must be 100 characters or less");
  }

  if (!metadata.description || metadata.description.trim().length === 0) {
    errors.push("Description is required");
  } else if (metadata.description.length > 1000) {
    errors.push("Description must be 1000 characters or less");
  }

  if (!metadata.image) {
    errors.push("Image URI is required");
  } else if (!metadata.image.startsWith("ipfs://")) {
    warnings.push("Image URI should use IPFS protocol (ipfs://...)");
  }

  // Optional fields validation
  if (metadata.external_url && !isValidUrl(metadata.external_url)) {
    errors.push("External URL must be a valid URL");
  }

  if (metadata.animation_url && !isValidUri(metadata.animation_url)) {
    warnings.push("Animation URL should be a valid IPFS or HTTP URI");
  }

  if (metadata.background_color && !/^#([0-9A-F]{3}){1,2}$/i.test(metadata.background_color)) {
    errors.push("Background color must be a valid hex color");
  }

  // Attributes validation
  if (metadata.attributes) {
    metadata.attributes.forEach((attr, index) => {
      if (!attr.trait_type || attr.trait_type.trim().length === 0) {
        errors.push(`Attribute ${index + 1}: trait_type is required`);
      }
      if (attr.value === undefined || attr.value === null) {
        errors.push(`Attribute ${index + 1}: value is required`);
      }
    });
  }

  // Creator validation
  if (!metadata.creator?.address) {
    errors.push("Creator address is required");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate media file
 */
export function validateMedia(
  file: File,
  mediaType: MediaType
): { valid: boolean; error?: string } {
  const config = MEDIA_CONFIGS[mediaType];

  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(config.maxSize / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  // Check MIME type
  if (!config.acceptedTypes.includes(file.type as MediaFormat)) {
    return {
      valid: false,
      error: `File type ${file.type} is not accepted. Accepted types: ${config.acceptedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

// ============================================================
// Pinata Provider Implementation
// ============================================================

async function uploadToPinata(
  file: File | Blob,
  config: StorageProviderConfig,
  options?: { name?: string; keyvalues?: Record<string, string> }
): Promise<UploadResponse> {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", new Blob([file]), options?.name || "file");
  }

  const metadata: Record<string, string> = {};
  if (options?.name) {
    metadata.name = options.name;
  }
  if (options?.keyvalues) {
    Object.entries(options.keyvalues).forEach(([key, value]) => {
      metadata[`keyvalues[${key}]`] = value;
    });
  }
  formData.append("pinataMetadata", JSON.stringify(metadata));

  const response = await fetch(`${config.apiUrl}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Pinata upload failed: ${error.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    cid: result.IpfsHash,
    uri: `ipfs://${result.IpfsHash}`,
    gatewayUrl: `${config.gatewayUrl}/${result.IpfsHash}`,
    size: result.PinSize,
    mimeType: file instanceof File ? file.type : "application/octet-stream",
  };
}

async function uploadJsonToPinata(
  json: object,
  config: StorageProviderConfig,
  name: string
): Promise<UploadResponse> {
  const response = await fetch(`${config.apiUrl}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Pinata JSON upload failed: ${error.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    cid: result.IpfsHash,
    uri: `ipfs://${result.IpfsHash}`,
    gatewayUrl: `${config.gatewayUrl}/${result.IpfsHash}`,
    size: JSON.stringify(json).length,
    mimeType: "application/json",
  };
}

// ============================================================
// Web3.Storage Provider Implementation
// ============================================================

async function uploadToWeb3Storage(
  file: File | Blob,
  config: StorageProviderConfig,
  options?: { name?: string }
): Promise<UploadResponse> {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file, options?.name || file.name);
  } else {
    formData.append("file", new Blob([file]), options?.name || "file");
  }

  const response = await fetch(`${config.apiUrl}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Web3.Storage upload failed: ${error.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    cid: result.cid,
    uri: `ipfs://${result.cid}`,
    gatewayUrl: `${config.gatewayUrl}/${result.cid}`,
    size: result.size || 0,
    mimeType: file instanceof File ? file.type : "application/octet-stream",
  };
}

// ============================================================
// NFT.Storage Provider Implementation
// ============================================================

async function uploadToNftStorage(
  file: File | Blob,
  config: StorageProviderConfig,
  options?: { name?: string }
): Promise<UploadResponse> {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file, options?.name || file.name);
  } else {
    formData.append("file", new Blob([file]), options?.name || "file");
  }

  const response = await fetch(`${config.apiUrl}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`NFT.Storage upload failed: ${error.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    cid: result.value.cid,
    uri: `ipfs://${result.value.cid}`,
    gatewayUrl: `${config.gatewayUrl}/${result.value.cid}`,
    size: result.value.size || 0,
    mimeType: file instanceof File ? file.type : "application/octet-stream",
  };
}

// ============================================================
// Local IPFS Node Implementation
// ============================================================

async function uploadToLocalIpfs(
  file: File | Blob,
  config: StorageProviderConfig,
  options?: { name?: string }
): Promise<UploadResponse> {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file, options?.name || file.name);
  } else {
    formData.append("file", new Blob([file]), options?.name || "file");
  }

  const response = await fetch(`${config.apiUrl}/api/v0/add`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Local IPFS upload failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    cid: result.Hash,
    uri: `ipfs://${result.Hash}`,
    gatewayUrl: `${config.gatewayUrl}/${result.Hash}`,
    size: parseInt(result.Size, 10),
    mimeType: file instanceof File ? file.type : "application/octet-stream",
  };
}

// ============================================================
// Public API Functions
// ============================================================

/**
 * Upload media file to decentralized storage
 *
 * @param file - File to upload
 * @param mediaType - Type of media (image, video, audio, animation)
 * @param options - Optional metadata for the upload
 * @returns Upload response with CID and URIs
 *
 * @example
 * ```ts
 * const result = await uploadMedia(file, "image", {
 *   name: "My NFT Image",
 *   nftId: "123",
 * });
 * console.log(result.uri); // ipfs://Qm...
 * ```
 */
export async function uploadMedia(
  file: File,
  mediaType: MediaType,
  options?: {
    name?: string;
    nftId?: string;
    collectionId?: string;
    provider?: StorageProvider;
  }
): Promise<MediaUploadResponse> {
  // Validate file
  const validation = validateMedia(file, mediaType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const provider = options?.provider || getDefaultProvider();
  const config = getStorageConfig(provider);

  // Check provider configuration
  const configValidation = validateStorageConfig(provider);
  if (!configValidation.valid) {
    throw new Error(
      `Storage provider not configured. Missing: ${configValidation.missing.join(", ")}`
    );
  }

  // Build key-value metadata for Pinata
  const keyvalues: Record<string, string> = {
    type: mediaType,
    marketplace: "nimiq-nft-marketplace",
  };
  if (options?.nftId) keyvalues.nftId = options.nftId;
  if (options?.collectionId) keyvalues.collectionId = options.collectionId;

  // Upload based on provider
  let result: UploadResponse;

  switch (provider) {
    case "pinata":
      result = await uploadToPinata(file, config, {
        name: options?.name || file.name,
        keyvalues,
      });
      break;

    case "web3.storage":
      result = await uploadToWeb3Storage(file, config, {
        name: options?.name || file.name,
      });
      break;

    case "nft.storage":
      result = await uploadToNftStorage(file, config, {
        name: options?.name || file.name,
      });
      break;

    case "local":
      result = await uploadToLocalIpfs(file, config, {
        name: options?.name || file.name,
      });
      break;

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return {
    cid: result.cid,
    uri: result.uri,
    gatewayUrl: result.gatewayUrl,
    size: result.size,
    mimeType: result.mimeType,
  };
}

/**
 * Upload NFT metadata to decentralized storage
 *
 * @param metadata - NFT metadata object
 * @param options - Upload options
 * @returns Upload response with metadata URI
 *
 * @example
 * ```ts
 * const result = await uploadMetadata({
 *   name: "My NFT",
 *   description: "A unique digital collectible",
 *   image: "ipfs://Qm...",
 *   attributes: [{ trait_type: "Color", value: "Blue" }],
 *   creator: { address: "NQ07 0000..." },
 * });
 * console.log(result.uri); // ipfs://Qm...
 * ```
 */
export async function uploadMetadata(
  metadata: Omit<NftMetadata, "schema_version" | "created_at">,
  options?: {
    name?: string;
    nftId?: string;
    collectionId?: string;
    provider?: StorageProvider;
  }
): Promise<UploadResponse> {
  // Validate metadata
  const validation = validateMetadata(metadata);
  if (!validation.valid) {
    throw new Error(`Invalid metadata: ${validation.errors.join(", ")}`);
  }

  const provider = options?.provider || getDefaultProvider();
  const config = getStorageConfig(provider);

  // Check provider configuration
  const configValidation = validateStorageConfig(provider);
  if (!configValidation.valid) {
    throw new Error(
      `Storage provider not configured. Missing: ${configValidation.missing.join(", ")}`
    );
  }

  // Add schema version and timestamps
  const fullMetadata: NftMetadata = {
    ...metadata,
    schema_version: "1.0.0",
    created_at: new Date().toISOString(),
  };

  // Upload based on provider
  let result: UploadResponse;
  const metadataName = options?.name || `${metadata.name}-metadata.json`;

  switch (provider) {
    case "pinata":
      result = await uploadJsonToPinata(fullMetadata, config, metadataName);
      break;

    case "web3.storage": {
      // For Web3.Storage, we need to upload JSON as a file
      const jsonBlob = new Blob([JSON.stringify(fullMetadata, null, 2)], {
        type: "application/json",
      });
      const file = new File([jsonBlob], metadataName, { type: "application/json" });
      result = await uploadToWeb3Storage(file, config, { name: metadataName });
      break;
    }

    case "nft.storage": {
      const jsonBlob = new Blob([JSON.stringify(fullMetadata, null, 2)], {
        type: "application/json",
      });
      const file = new File([jsonBlob], metadataName, { type: "application/json" });
      result = await uploadToNftStorage(file, config, { name: metadataName });
      break;
    }

    case "local": {
      const jsonBlob = new Blob([JSON.stringify(fullMetadata, null, 2)], {
        type: "application/json",
      });
      const file = new File([jsonBlob], metadataName, { type: "application/json" });
      result = await uploadToLocalIpfs(file, config, { name: metadataName });
      break;
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return {
    cid: result.cid,
    uri: result.uri,
    gatewayUrl: result.gatewayUrl,
    size: result.size,
    mimeType: "application/json",
  };
}

/**
 * Retrieve metadata from IPFS
 *
 * @param uri - IPFS URI or gateway URL
 * @param provider - Storage provider for gateway URL
 * @returns Parsed NFT metadata
 *
 * @example
 * ```ts
 * const metadata = await getMetadata("ipfs://Qm...");
 * console.log(metadata.name); // "My NFT"
 * ```
 */
export async function getMetadata(
  uri: string,
  provider?: StorageProvider
): Promise<NftMetadata> {
  let url: string;

  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "").split("/")[0];
    const config = getStorageConfig(provider || getDefaultProvider());
    url = `${config.gatewayUrl}/${cid}`;
  } else if (uri.startsWith("http")) {
    url = uri;
  } else {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }

  const metadata: NftMetadata = await response.json();

  // Validate the retrieved metadata
  const validation = validateMetadata(metadata);
  if (!validation.valid) {
    console.warn("Retrieved metadata has validation issues:", validation.errors);
  }

  return metadata;
}

/**
 * Get IPFS gateway URL for a CID
 */
export function getGatewayUrl(cid: string, provider?: StorageProvider): string {
  const config = getStorageConfig(provider || getDefaultProvider());
  return `${config.gatewayUrl}/${cid}`;
}

/**
 * Extract CID from IPFS URI
 */
export function extractCid(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "").split("/")[0];
  }
  // Try to extract from gateway URL
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
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

function isValidUri(uri: string): boolean {
  if (uri.startsWith("ipfs://")) return true;
  return isValidUrl(uri);
}
