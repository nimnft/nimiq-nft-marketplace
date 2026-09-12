import { WalletError, WalletErrorType } from "./types";

const ERROR_MESSAGES: Record<WalletErrorType, string> = {
  WALLET_NOT_FOUND:
    "Nimiq Hub not found. Please install the Nimiq Wallet extension or visit hub.nimiq.com.",
  USER_REJECTED: "Connection was rejected by the user.",
  NETWORK_ERROR:
    "Network error. Please check your connection and try again.",
  INSUFFICIENT_BALANCE: "Insufficient balance for this transaction.",
  INVALID_ADDRESS: "The provided address is not a valid Nimiq address.",
  TRANSACTION_FAILED: "Transaction failed. Please try again.",
  SIGNING_FAILED: "Message signing failed. Please try again.",
  UNKNOWN: "An unknown error occurred. Please try again.",
};

export function createWalletError(
  type: WalletErrorType,
  originalError?: unknown,
  customMessage?: string,
): WalletError {
  const message = customMessage || ERROR_MESSAGES[type];
  const error = new Error(message) as WalletError;
  error.type = type;
  error.originalError = originalError;
  return error;
}

export function classifyError(error: unknown): WalletErrorType {
  if (!error || typeof error !== "object") return "UNKNOWN";

  const msg = String(error).toLowerCase();
  const name = "name" in error ? String(error.name).toLowerCase() : "";
  const code =
    "code" in error ? (error as { code: number }).code : undefined;

  // User rejected / cancelled
  if (
    msg.includes("rejected") ||
    msg.includes("cancelled") ||
    msg.includes("user declined") ||
    msg.includes("user cancelled") ||
    code === 4001 ||
    code === -32002
  ) {
    return "USER_REJECTED";
  }

  // Wallet not found
  if (
    msg.includes("not found") ||
    msg.includes("not installed") ||
    msg.includes("no nimiq") ||
    name.includes("notfound") ||
    name.includes("referenceerror")
  ) {
    return "WALLET_NOT_FOUND";
  }

  // Network errors
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("fetch") ||
    msg.includes("econnrefused") ||
    msg.includes("cors")
  ) {
    return "NETWORK_ERROR";
  }

  // Insufficient balance
  if (
    msg.includes("insufficient") ||
    msg.includes("not enough") ||
    msg.includes("balance")
  ) {
    return "INSUFFICIENT_BALANCE";
  }

  // Invalid address
  if (
    msg.includes("invalid address") ||
    msg.includes("bad address") ||
    msg.includes("address format")
  ) {
    return "INVALID_ADDRESS";
  }

  // Transaction failed
  if (
    msg.includes("transaction") ||
    msg.includes("send") ||
    msg.includes("broadcast")
  ) {
    return "TRANSACTION_FAILED";
  }

  // Signing failed
  if (msg.includes("sign") || msg.includes("signature")) {
    return "SIGNING_FAILED";
  }

  return "UNKNOWN";
}
