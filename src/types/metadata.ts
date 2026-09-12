/**
 * NFT Metadata Types
 *
 * Defines the schema for NFT metadata following ERC-721 Metadata Standard
 * with IPFS compatibility. All URIs use IPFS content-addressed format.
 */

export type MediaType = "image" | "video" | "audio" | "animation";

export type MediaFormat = 
  | "image/png" 
  | "image/jpeg" 
  | "image/gif" 
  | "image/webp" 
  | "image/svg+xml"
  | "video/mp4" 
  | "video/webm" 
  | "video/quicktime"
  | "audio/mpeg" 
  | "audio/wav" 
  | "audio/ogg" 
  | "audio/flac"
  | "application/json";

export interface MediaConfig {
  maxSize: number; // bytes
  acceptedTypes: MediaFormat[];
  thumbnailSizes?: { width: number; height: number }[];
}

export const MEDIA_CONFIGS: Record<MediaType, MediaConfig> = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"],
    thumbnailSizes: [
      { width: 256, height: 256 },
      { width: 512, height: 512 },
    ],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    acceptedTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  audio: {
    maxSize: 50 * 1024 * 1024, // 50MB
    acceptedTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"],
  },
  animation: {
    maxSize: 50 * 1024 * 1024, // 50MB
    acceptedTypes: ["image/gif", "video/mp4", "video/webm", "application/json"],
  },
};

/**
 * NFT Attribute - trait/key-value pair
 */
export interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: "string" | "number" | "date" | "boost_percentage" | "boost_number";
  max_value?: number;
}

/**
 * NFT Metadata - ERC-721 compatible
 * All URIs are IPFS CIDs or IPFS gateway URLs
 */
export interface NftMetadata {
  // Required fields
  name: string;
  description: string;
  image: string; // IPFS URI (ipfs://Qm...)
  
  // Optional fields
  external_url?: string;
  animation_url?: string;
  background_color?: string;
  
  // NFT-specific fields
  attributes: NftAttribute[];
  
  // Marketplace extensions
  creator: {
    address: string;
    name?: string;
    avatar?: string;
  };
  collection?: {
    id: string;
    name: string;
    slug: string;
  };
  
  // Media details
  media?: {
    type: MediaType;
    uri: string; // IPFS URI of the actual media file
    mimeType: MediaFormat;
    size: number; // bytes
    dimensions?: {
      width: number;
      height: number;
    };
    duration?: number; // seconds, for video/audio
  };
  
  // Provenance & versioning
  schema_version: string; // e.g., "1.0.0"
  created_at: string; // ISO 8601
  updated_at?: string;
}

/**
 * Upload response from storage provider
 */
export interface UploadResponse {
  cid: string; // Content Identifier
  uri: string; // IPFS URI (ipfs://...)
  gatewayUrl: string; // HTTP gateway URL
  size: number;
  mimeType: string;
}

/**
 * Metadata upload request
 */
export interface MetadataUploadRequest {
  metadata: Omit<NftMetadata, "schema_version" | "created_at">;
}

/**
 * Media upload response
 */
export interface MediaUploadResponse {
  cid: string;
  uri: string;
  gatewayUrl: string;
  size: number;
  mimeType: string;
  thumbnail?: {
    cid: string;
    uri: string;
    gatewayUrl: string;
  };
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  name: string;
  apiUrl: string;
  gatewayUrl: string;
  apiKey?: string; // Server-side only
  maxFileSize: number;
  pinningEnabled: boolean;
}

/**
 * Pinning status
 */
export interface PinningStatus {
  cid: string;
  status: "queued" | "pinning" | "pinned" | "failed";
  updatedAt: string;
}

/**
 * Metadata validation result
 */
export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
