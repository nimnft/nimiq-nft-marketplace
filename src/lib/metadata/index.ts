/**
 * NFT Metadata Module
 *
 * Decentralized storage service for NFT media and metadata.
 * Server-side only for upload operations (API keys are protected).
 */

// Types
export type {
  MediaType,
  MediaFormat,
  MediaConfig,
  NftAttribute,
  NftMetadata,
  UploadResponse,
  MediaUploadResponse,
  MetadataUploadRequest,
  StorageProviderConfig,
  PinningStatus,
  MetadataValidationResult,
} from "@/types/metadata";

export { MEDIA_CONFIGS } from "@/types/metadata";

// Configuration
export type { StorageProvider } from "./config";
export {
  getStorageConfig,
  getDefaultProvider,
  validateStorageConfig,
  ENV_DOCS,
} from "./config";

// Service (server-side only)
export {
  validateMetadata,
  validateMedia,
  uploadMedia,
  uploadMetadata,
  getMetadata,
  getGatewayUrl,
  extractCid,
} from "./service";
