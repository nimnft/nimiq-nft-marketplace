"use client";

/**
 * useMetadata Hook
 *
 * React hook for NFT metadata upload operations.
 * Handles media upload, metadata creation, and IPFS interactions.
 */

import { useState, useCallback } from "react";
import type { MediaType, NftMetadata, MediaUploadResponse, NftAttribute } from "@/types/metadata";
import type { UploadProgress } from "@/lib/metadata/client";
import {
  uploadMediaToApi,
  uploadMetadataToApi,
  getMetadataFromApi,
  getMediaTypeFromFile,
  isFileAccepted,
  createFilePreview,
  revokeFilePreview,
  buildNftMetadata,
  validateMetadataClient,
  ipfsToGatewayUrl,
  extractCidFromUri,
  formatFileSize,
} from "@/lib/metadata/client";

export interface UseMetadataOptions {
  onUploadStart?: () => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (result: MediaUploadResponse) => void;
  onUploadError?: (error: string) => void;
}

export interface UseMetadataReturn {
  // Upload state
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadResult: MediaUploadResponse | null;
  error: string | null;

  // Actions
  uploadMedia: (
    file: File,
    mediaType: MediaType,
    options?: {
      name?: string;
      nftId?: string;
      collectionId?: string;
    }
  ) => Promise<MediaUploadResponse>;

  uploadMetadata: (
    metadata: Omit<NftMetadata, "schema_version" | "created_at">,
    options?: {
      name?: string;
      nftId?: string;
      collectionId?: string;
    }
  ) => Promise<{ uri: string; cid: string; gatewayUrl: string }>;

  getMetadata: (cid: string) => Promise<{ metadata: NftMetadata; gatewayUrl: string }>;

  // File utilities
  getMediaType: (file: File) => MediaType | null;
  isAccepted: (file: File, mediaType: MediaType) => boolean;
  createPreview: (file: File) => string;
  revokePreview: (url: string) => void;
  formatSize: (bytes: number) => string;

  // IPFS utilities
  toGatewayUrl: (uri: string) => string;
  extractCid: (uri: string) => string | null;

  // Metadata builder
  buildMetadata: (params: Parameters<typeof buildNftMetadata>[0]) => Omit<NftMetadata, "schema_version" | "created_at">;

  // Validation
  validate: (metadata: Partial<NftMetadata>) => { valid: boolean; errors: string[] };

  // Reset
  reset: () => void;
}

export function useMetadata(options?: UseMetadataOptions): UseMetadataReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<MediaUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    setUploadResult(null);
    setError(null);
  }, []);

  const uploadMedia = useCallback(
    async (
      file: File,
      mediaType: MediaType,
      opts?: {
        name?: string;
        nftId?: string;
        collectionId?: string;
      }
    ): Promise<MediaUploadResponse> => {
      // Validate file
      if (!isFileAccepted(file, mediaType)) {
        const errorMsg = `File type ${file.type} is not accepted for ${mediaType}`;
        setError(errorMsg);
        options?.onUploadError?.(errorMsg);
        throw new Error(errorMsg);
      }

      setIsUploading(true);
      setUploadProgress(null);
      setUploadResult(null);
      setError(null);
      options?.onUploadStart?.();

      try {
        const result = await uploadMediaToApi(file, mediaType, (progress) => {
          setUploadProgress(progress);
          options?.onUploadProgress?.(progress);
        }, opts);

        setUploadResult(result);
        options?.onUploadComplete?.(result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setError(errorMsg);
        options?.onUploadError?.(errorMsg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const uploadMetadataFn = useCallback(
    async (
      metadata: Omit<NftMetadata, "schema_version" | "created_at">,
      opts?: {
        name?: string;
        nftId?: string;
        collectionId?: string;
      }
    ) => {
      // Client-side validation
      const validation = validateMetadataClient(metadata);
      if (!validation.valid) {
        const errorMsg = `Invalid metadata: ${validation.errors.join(", ")}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadMetadataToApi(metadata, opts);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Metadata upload failed";
        setError(errorMsg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const getMetadataFn = useCallback(async (cid: string) => {
    setError(null);
    try {
      const result = await getMetadataFromApi(cid);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Metadata retrieval failed";
      setError(errorMsg);
      throw err;
    }
  }, []);

  return {
    // State
    isUploading,
    uploadProgress,
    uploadResult,
    error,

    // Actions
    uploadMedia,
    uploadMetadata: uploadMetadataFn,
    getMetadata: getMetadataFn,

    // File utilities
    getMediaType: getMediaTypeFromFile,
    isAccepted: isFileAccepted,
    createPreview: createFilePreview,
    revokePreview: revokeFilePreview,
    formatSize: formatFileSize,

    // IPFS utilities
    toGatewayUrl: ipfsToGatewayUrl,
    extractCid: extractCidFromUri,

    // Metadata builder
    buildMetadata: buildNftMetadata,

    // Validation
    validate: validateMetadataClient,

    // Reset
    reset,
  };
}

export default useMetadata;
