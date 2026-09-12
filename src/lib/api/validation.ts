/**
 * API Utilities for NimiqNFT
 *
 * Provides validation, error handling, and response formatting.
 */

import type { ApiResponse, PaginationParams } from "../db/schema";

// ─── Error Classes ───────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id ${id} not found` : `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Too many requests") {
    super(429, message, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

// ─── Validation Utilities ────────────────────────────────

const NIMIQ_ADDRESS_REGEX = /^NQ\d{2}\s[A-Z0-9]{4}\s[A-Z0-9]{4}\s[A-Z0-9]{4}\s[A-Z0-9]{4}\s[A-Z0-9]{4}\s[A-Z0-9]{4}$/;
const NIMIQ_ADDRESS_CLEAN = /^NQ\d{2}[A-Z0-9]{28}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_TX_HASH = /^0x[0-9a-f]{64}$/i;

export function isValidNimiqAddress(address: string): boolean {
  return NIMIQ_ADDRESS_REGEX.test(address) || NIMIQ_ADDRESS_CLEAN.test(address.replace(/\s/g, ""));
}

export function cleanNimiqAddress(address: string): string {
  return address.replace(/\s/g, "");
}

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 100;
}

export function isValidTxHash(hash: string): boolean {
  return HEX_TX_HASH.test(hash);
}

export function isValidIpfsUri(uri: string): boolean {
  return uri.startsWith("ipfs://") || uri.startsWith("https://") || uri.startsWith("data:");
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLunaAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 0;
}

export function validateRoyaltyPercent(percent: unknown): percent is number {
  return typeof percent === "number" && percent >= 0 && percent <= 10 && Number.isInteger(percent * 100);
}

// ─── Pagination ──────────────────────────────────────────

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  return { page, limit, sortBy, sortOrder };
}

export function calculatePagination(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

// ─── Response Helpers ────────────────────────────────────

export function successResponse<T>(data: T, status = 200): Response {
  const response: ApiResponse<T> = { success: true, data };
  return Response.json(response, { status });
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  status = 200,
): Response {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination: calculatePagination(total, page, limit),
  };
  return Response.json(response, { status });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    return Response.json(
      { success: false, error: error.message, fields: error.fields },
      { status: error.statusCode },
    );
  }

  if (error instanceof ApiError) {
    return Response.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  console.error("Unexpected error:", error);
  return Response.json(
    { success: false, error: "Internal server error" },
    { status: 500 },
  );
}

// ─── Sanitization ────────────────────────────────────────

export function sanitizeString(input: string, maxLength = 1000): string {
  return input.trim().slice(0, maxLength);
}

export function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break queries
  return query.replace(/[<>'"%;()]/g, "").trim().slice(0, 200);
}

// ─── Rate Limiting (Simple In-Memory) ────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60_000);
}
