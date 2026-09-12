"use client";

/**
 * usePurchase Hook
 *
 * React hook for the NFT purchase flow.
 * Manages the complete state machine from validation to blockchain confirmation.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@/lib/wallet-provider";
import {
  validateListing,
  validateOwnership,
  validateBalance,
  calculateFees,
  waitForConfirmation,
  verifyPurchaseTransaction,
} from "./service";
import type {
  PurchaseStep,
  PurchaseState,
  PurchaseError,
  PurchaseErrorType,
  PurchaseFees,
  PurchaseTransactionData,
  PurchaseResult,
} from "./types";
import {
  INITIAL_PURCHASE_STATE,
  PURCHASE_ERROR_MESSAGES,
} from "./types";

interface UsePurchaseOptions {
  onStepChange?: (step: PurchaseStep) => void;
  onError?: (error: PurchaseError) => void;
  onSuccess?: (result: PurchaseResult) => void;
}

interface UsePurchaseReturn {
  state: PurchaseState;
  start: (nftId: string) => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => void;
  retry: () => Promise<void>;
  reset: () => void;
  isProcessing: boolean;
  canCancel: boolean;
}

export function usePurchase(options?: UsePurchaseOptions): UsePurchaseReturn {
  const [state, setState] = useState<PurchaseState>(INITIAL_PURCHASE_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { account, state: walletState, service: walletService } = useWallet();

  const address = account?.address || null;
  const isConnected = walletState === "connected";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateState = useCallback((updates: Partial<PurchaseState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback(
    (type: PurchaseErrorType, details?: unknown) => {
      const error: PurchaseError = {
        type,
        message: PURCHASE_ERROR_MESSAGES[type],
        details,
        recoverable: type !== "nft-already-sold",
      };
      updateState({ step: "error", error });
      options?.onError?.(error);
    },
    [updateState, options]
  );

  const start = useCallback(
    async (nftId: string) => {
      // Reset state
      abortControllerRef.current = new AbortController();
      updateState({
        ...INITIAL_PURCHASE_STATE,
        nftId,
        step: "checking-wallet",
        startedAt: new Date().toISOString(),
      });

      try {
        // Step 1: Check wallet connection
        if (!isConnected || !address) {
          setError("wallet-not-connected");
          return;
        }

        // Step 2: Check listing exists
        updateState({ step: "checking-listing" });
        const listingResult = await validateListing(nftId);
        if (!listingResult.valid) {
          setError(listingResult.error as PurchaseErrorType);
          return;
        }

        // Step 3: Check ownership
        updateState({ step: "checking-ownership" });
        const ownershipResult = await validateOwnership(
          nftId,
          listingResult.listing!.sellerAddress
        );
        if (!ownershipResult.valid) {
          setError(ownershipResult.error as PurchaseErrorType);
          return;
        }

        // Step 4: Calculate fees
        updateState({ step: "calculating-fees" });
        const fees = calculateFees(
          listingResult.listing!.price,
        );

        // Update state with all validation results
        updateState({
          listing: listingResult.listing!,
          ownership: ownershipResult.ownership!,
          fees,
          step: "confirming",
        });
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) return;
        setError("unknown", err);
      }
    },
    [address, isConnected, updateState, setError]
  );

  const confirm = useCallback(async () => {
    if (!state.listing || !state.fees || !address) {
      setError("unknown");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // Step 5: Check balance
      const balanceResult = await validateBalance(
        address,
        state.fees.totalCost
      );
      if (!balanceResult.valid) {
        setError("insufficient-balance", {
          required: state.fees.totalCost,
          available: balanceResult.balance,
        });
        return;
      }

      // Step 6: Send transaction via wallet
      updateState({ step: "signing" });

      const txRequest = {
        appName: "NimiqNFT",
        recipient: state.listing.sellerAddress,
        value: state.fees.totalCost,
        fee: 0,
        extraData: new TextEncoder().encode(`NFT:${state.nftId}`),
      };

      let signedTx;
      try {
        signedTx = await walletService.sendTransaction(txRequest);
      } catch (err: any) {
        // Handle wallet rejection
        if (err?.name === "OperationCanceledException" || 
            err?.message?.includes("cancel") ||
            err?.message?.includes("reject")) {
          setError("wallet-rejected");
          return;
        }
        throw err;
      }

      if (!signedTx) {
        setError("wallet-rejected");
        return;
      }

      const txData: PurchaseTransactionData = {
        txHash: signedTx.hash,
        serializedTx: signedTx.serializedTx,
        senderAddress: address,
        recipientAddress: state.listing.sellerAddress,
        amount: state.fees.totalCost,
        fee: 0,
        confirmations: 0,
      };

      updateState({
        step: "pending",
        transaction: txData,
      });

      // Step 7: Wait for blockchain confirmation
      updateState({ step: "confirming-blockchain" });

      const confirmation = await waitForConfirmation(txData.txHash, {
        maxAttempts: 60,
        intervalMs: 3000,
        requiredConfirmations: 1,
      });

      if (!confirmation.confirmed) {
        // Transaction might still be pending
        updateState({
          step: "pending",
          error: {
            type: "indexing-delay",
            message: PURCHASE_ERROR_MESSAGES["indexing-delay"],
            recoverable: true,
          },
        });
        
        // Continue waiting in background
        const finalConfirmation = await waitForConfirmation(txData.txHash, {
          maxAttempts: 120,
          intervalMs: 5000,
          requiredConfirmations: 1,
        });

        if (!finalConfirmation.confirmed) {
          setError("transaction-failed");
          return;
        }

        txData.confirmations = finalConfirmation.confirmations;
        txData.blockNumber = finalConfirmation.blockNumber;
      } else {
        txData.confirmations = confirmation.confirmations;
        txData.blockNumber = confirmation.blockNumber;
      }

      // Step 8: Verify transaction
      updateState({ step: "verifying" });

      const verification = await verifyPurchaseTransaction(
        txData.txHash,
        state.listing.sellerAddress,
        state.fees.totalCost
      );

      if (!verification.valid) {
        setError("transaction-failed", verification.error);
        return;
      }

      // Step 9: Index the transaction
      updateState({ step: "indexing" });

      // In production: call backend API to index the purchase
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 10: Success!
      const result: PurchaseResult = {
        success: true,
        nftId: state.nftId!,
        buyerAddress: address,
        sellerAddress: state.listing.sellerAddress,
        transaction: txData,
        fees: state.fees,
        completedAt: new Date().toISOString(),
      };

      updateState({
        step: "success",
        completedAt: result.completedAt,
      });

      options?.onSuccess?.(result);
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return;
      setError("transaction-failed", err);
    }
  }, [state, address, walletService, updateState, setError, options]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(INITIAL_PURCHASE_STATE);
  }, []);

  const retry = useCallback(async () => {
    if (state.nftId) {
      await start(state.nftId);
    }
  }, [state.nftId, start]);

  const reset = useCallback(() => {
    setState(INITIAL_PURCHASE_STATE);
  }, []);

  const isProcessing = [
    "checking-wallet",
    "checking-listing",
    "checking-ownership",
    "fetching-price",
    "calculating-fees",
    "signing",
    "pending",
    "confirming-blockchain",
    "verifying",
    "indexing",
  ].includes(state.step);

  const canCancel = ["confirming", "error"].includes(state.step);

  return {
    state,
    start,
    confirm,
    cancel,
    retry,
    reset,
    isProcessing,
    canCancel,
  };
}

export default usePurchase;
