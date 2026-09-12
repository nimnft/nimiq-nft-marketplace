"use client";

/**
 * PurchaseModal Component
 *
 * Full purchase flow modal with validation, confirmation, and status tracking.
 * Never shows "Purchase successful" before blockchain confirmation.
 */

import React, { useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { usePurchase } from "@/lib/purchase/hook";
import type { PurchaseStep, PurchaseError, PurchaseResult } from "@/lib/purchase/types";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  nftName: string;
  nftImage: string;
  sellerAddress: string;
  onSuccess?: (result: PurchaseResult) => void;
}

export function PurchaseModal({
  isOpen,
  onClose,
  nftId,
  nftName,
  nftImage,
  sellerAddress,
  onSuccess,
}: PurchaseModalProps) {
  const {
    state,
    start,
    confirm,
    cancel,
    retry,
    reset,
    isProcessing,
    canCancel,
  } = usePurchase({
    onSuccess: (result) => {
      onSuccess?.(result);
    },
  });

  // Start purchase flow when modal opens
  useEffect(() => {
    if (isOpen && nftId) {
      start(nftId);
    }
    return () => {
      if (!isOpen) {
        reset();
      }
    };
  }, [isOpen, nftId, start, reset]);

  const handleClose = () => {
    if (canCancel) {
      cancel();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle(state.step)}
    >
      <div className="p-0">
        {/* NFT Preview */}
        <div className="mb-6 flex items-center gap-4">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
            <img
              src={nftImage}
              alt={nftName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-text">{nftName}</h3>
            <p className="text-sm text-text-muted">
              Seller: {sellerAddress.slice(0, 8)}...{sellerAddress.slice(-4)}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {state.step === "idle" && <IdleStep />}
          {["checking-wallet", "checking-listing", "checking-ownership", "fetching-price", "calculating-fees"].includes(state.step) && (
            <ValidationStep step={state.step} />
          )}
          {state.step === "confirming" && state.fees && (
            <ConfirmationStep
              fees={state.fees}
              onConfirm={confirm}
            />
          )}
          {state.step === "signing" && <SigningStep />}
          {state.step === "pending" && (
            <PendingStep txHash={state.transaction?.txHash} />
          )}
          {state.step === "confirming-blockchain" && (
            <BlockchainConfirmStep txHash={state.transaction?.txHash} />
          )}
          {state.step === "verifying" && <VerifyingStep />}
          {state.step === "indexing" && <IndexingStep />}
          {state.step === "success" && state.transaction && (
            <SuccessStep
              transaction={state.transaction}
              nftName={nftName}
            />
          )}
          {state.step === "error" && state.error && (
            <ErrorStep
              error={state.error}
              onRetry={retry}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Action Buttons */}
        {state.step !== "success" && state.step !== "error" && (
          <div className="flex gap-3">
            {canCancel && (
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>
            )}
            {state.step === "confirming" && (
              <button
                onClick={confirm}
                className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Confirm Purchase
              </button>
            )}
          </div>
        )}

        {/* Error Actions */}
        {state.step === "error" && state.error?.recoverable && (
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover"
            >
              Close
            </button>
            <button
              onClick={retry}
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// Step Components
// ============================================================

function getModalTitle(step: PurchaseStep): string {
  switch (step) {
    case "success":
      return "Purchase Complete";
    case "error":
      return "Purchase Failed";
    case "confirming":
      return "Confirm Purchase";
    default:
      return "Purchase NFT";
  }
}

function IdleStep() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="h-8 w-48 animate-shimmer rounded bg-surface" />
    </div>
  );
}

function ValidationStep({ step }: { step: string }) {
  const messages: Record<string, string> = {
    "checking-wallet": "Checking wallet connection...",
    "checking-listing": "Verifying listing availability...",
    "checking-ownership": "Validating NFT ownership...",
    "fetching-price": "Fetching current price...",
    "calculating-fees": "Calculating fees...",
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-text-secondary">{messages[step] || "Processing..."}</p>
    </div>
  );
}

function ConfirmationStep({
  fees,
  onConfirm,
}: {
  fees: import("@/lib/purchase/types").PurchaseFees;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-text">Transaction Summary</h4>

      <div className="space-y-3 rounded-lg bg-bg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">NFT Price</span>
          <span className="text-text">
            {fees.priceNim.toFixed(2)} NIM
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Marketplace Fee (2.5%)</span>
          <span className="text-text">
            {fees.marketplaceFeeNim.toFixed(4)} NIM
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Creator Royalty (5%)</span>
          <span className="text-text">
            {fees.creatorRoyaltyNim.toFixed(4)} NIM
          </span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="font-medium text-text">Total Cost</span>
            <span className="font-bold text-text">
              {fees.totalCostNim.toFixed(4)} NIM
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        By confirming, you agree to purchase this NFT for the total amount shown above.
      </p>
    </div>
  );
}

function SigningStep() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-text">Waiting for wallet confirmation...</p>
      <p className="mt-1 text-xs text-text-muted">
        Please confirm the transaction in your Nimiq Hub wallet.
      </p>
    </div>
  );
}

function PendingStep({ txHash }: { txHash?: string }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-text">Transaction Submitted</p>
      {txHash && (
        <div className="mt-2 rounded-lg bg-bg px-3 py-2">
          <p className="font-mono text-xs text-text-muted">
            TX: {txHash.slice(0, 12)}...{txHash.slice(-8)}
          </p>
        </div>
      )}
      <p className="mt-2 text-xs text-text-muted">
        Waiting for blockchain confirmation...
      </p>
    </div>
  );
}

function BlockchainConfirmStep({ txHash }: { txHash?: string }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-text">Confirming on Blockchain</p>
      <p className="mt-1 text-xs text-text-muted">
        This may take a few minutes. Please don&apos;t close this window.
      </p>
      {txHash && (
        <a
          href={`https://nimiqwatch.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-primary hover:underline"
        >
          View on Explorer
        </a>
      )}
    </div>
  );
}

function VerifyingStep() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-text">Verifying Transaction...</p>
    </div>
  );
}

function IndexingStep() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-text">Updating Marketplace...</p>
      <p className="mt-1 text-xs text-text-muted">
        Recording ownership transfer...
      </p>
    </div>
  );
}

function SuccessStep({
  transaction,
  nftName,
}: {
  transaction: import("@/lib/purchase/types").PurchaseTransactionData;
  nftName: string;
}) {
  return (
    <div className="flex flex-col items-center py-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
        <svg
          className="h-8 w-8 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-text">
        Purchase Complete!
      </h3>
      <p className="mb-4 text-sm text-text-secondary">
        You now own <span className="font-medium text-text">{nftName}</span>
      </p>

      <div className="w-full rounded-lg bg-bg p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">Transaction Hash</span>
          <a
            href={`https://nimiqwatch.com/tx/${transaction.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View on Explorer
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
        </div>
        <p className="break-all font-mono text-xs text-text-muted">
          {transaction.txHash}
        </p>
        {transaction.blockNumber && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-text-muted">Block</span>
            <span className="text-xs text-text">#{transaction.blockNumber}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">Confirmations</span>
          <span className="text-xs text-success">
            {transaction.confirmations} confirmed
          </span>
        </div>
      </div>
    </div>
  );
}

function ErrorStep({
  error,
  onRetry,
  onClose,
}: {
  error: PurchaseError;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/20">
        <svg
          className="h-8 w-8 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-text">
        Purchase Failed
      </h3>
      <p className="mb-4 text-center text-sm text-text-secondary">
        {error.message}
      </p>

      {error.recoverable && (
        <div className="w-full">
          <button
            onClick={onRetry}
            className="mb-2 w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover"
          >
            Close
          </button>
        </div>
      )}

      {!error.recoverable && (
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover"
        >
          Close
        </button>
      )}
    </div>
  );
}

export default PurchaseModal;
