"use client";

/**
 * Metadata Preview Component
 *
 * Displays a preview of NFT metadata with IPFS links.
 */

import React from "react";
import type { NftMetadata } from "@/types/metadata";
import { ipfsToGatewayUrl, extractCidFromUri } from "@/lib/metadata/client";

interface MetadataPreviewProps {
  metadata: NftMetadata;
  className?: string;
  showLinks?: boolean;
}

export function MetadataPreview({
  metadata,
  className = "",
  showLinks = true,
}: MetadataPreviewProps) {
  const cid = extractCidFromUri(metadata.image);
  const gatewayUrl = cid ? ipfsToGatewayUrl(metadata.image) : metadata.image;

  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-text">{metadata.name}</h3>
        <span className="text-xs text-text-muted">v{metadata.schema_version}</span>
      </div>

      {/* Image Preview */}
      <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-bg">
        <img
          src={gatewayUrl}
          alt={metadata.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-nft.png";
          }}
        />
      </div>

      {/* Description */}
      <p className="mb-3 text-sm text-text-secondary line-clamp-3">
        {metadata.description}
      </p>

      {/* Attributes */}
      {metadata.attributes.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-2 text-xs font-medium text-text-muted">Properties</h4>
          <div className="grid grid-cols-2 gap-2">
            {metadata.attributes.slice(0, 4).map((attr, index) => (
              <div
                key={index}
                className="rounded-md bg-bg p-2 text-center"
              >
                <div className="text-xs text-primary">{attr.trait_type}</div>
                <div className="text-sm font-medium text-text">{String(attr.value)}</div>
              </div>
            ))}
          </div>
          {metadata.attributes.length > 4 && (
            <div className="mt-2 text-center text-xs text-text-muted">
              +{metadata.attributes.length - 4} more
            </div>
          )}
        </div>
      )}

      {/* Creator */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-text-muted">Creator:</span>
        <span className="font-medium text-text">
          {metadata.creator.name || metadata.creator.address.slice(0, 8) + "..."}
        </span>
      </div>

      {/* IPFS Links */}
      {showLinks && cid && (
        <div className="border-t border-border pt-3">
          <h4 className="mb-2 text-xs font-medium text-text-muted">IPFS Metadata</h4>
          <div className="space-y-1">
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <span>View on IPFS Gateway</span>
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span>CID:</span>
              <code className="rounded bg-bg px-1 font-mono">{cid.slice(0, 12)}...</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetadataPreview;
