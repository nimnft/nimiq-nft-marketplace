/**
 * Nimiq Wallet Adapter
 *
 * Auto-detects Nimiq Pay native provider (window.nimiq / window.nimiqPay)
 * and falls back to Hub API popup for desktop browsers.
 *
 * Nimiq Pay detection:
 * - window.nimiq (injected by Nimiq Pay app)
 * - window.nimiqPay (injected by Nimiq Pay app)
 *
 * Hub API fallback:
 * - @nimiq/hub-api popup-based flow
 */

import type {
  WalletService,
  WalletAccount,
  WalletConnectionState,
  WalletCapabilities,
  SignedTransaction,
  SignedMessage,
  TransactionRequest,
  MessageSignRequest,
} from "./types";
import { NimiqAccountType } from "./types";
import { getWalletConfig } from "./config";
import { createWalletError, classifyError } from "./errors";

interface NimiqHubApi {
  chooseAddress: (opts: { appName: string }) => Promise<{ address: string; label: string }>;
  checkout: (opts: {
    appName: string;
    recipient: string;
    value: number;
    sender?: string;
    fee?: number;
    validityDuration?: number;
    extraData?: string | Uint8Array;
    shopLogoUrl?: string;
    forceSender?: boolean;
    flags?: number;
    recipientType?: number;
  }) => Promise<{
    hash: string;
    serializedTx: string;
    raw: {
      signerPublicKey: Uint8Array;
      signature: Uint8Array;
      sender: string;
      senderType: number;
      recipient: string;
      recipientType: number;
      value: number;
      fee: number;
      validityStartHeight: number;
      extraData: Uint8Array;
      flags: number;
      networkId: number;
    };
  }>;
  signMessage: (opts: {
    appName: string;
    message: string | Uint8Array;
    signer?: string;
  }) => Promise<{
    signer: string;
    signerPublicKey: Uint8Array;
    signature: Uint8Array;
  }>;
}

/** Nimiq Pay native provider injected into the page */
interface NimiqPayProvider {
  isNimiqPay?: boolean;
  request?: (opts: { method: string; params?: any }) => Promise<any>;
  // Legacy Nimiq Pay methods
  nimiq?: {
    getUserAddress?: () => Promise<{ address: string; publicKey: string }>;
    signTransaction?: (tx: any) => Promise<any>;
  };
}

let hubApiModule: NimiqHubApi | null = null;
let hubApiLoadAttempted = false;

async function loadHubApi(): Promise<NimiqHubApi | null> {
  if (hubApiLoadAttempted) return hubApiModule;
  hubApiLoadAttempted = true;
  try {
    const mod = await import("@nimiq/hub-api");
    const HubApi = mod.default;
    const config = getWalletConfig("mainnet");
    hubApiModule = new HubApi(config.hubUrl);
    return hubApiModule;
  } catch {
    return null;
  }
}

function getNimiqPayProvider(): NimiqPayProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Record<string, any>;
  // Check for Nimiq Pay injected providers
  if (w.nimiqPay && typeof w.nimiqPay === "object") return w.nimiqPay;
  if (w.nimiq && typeof w.nimiq === "object" && w.nimiq.getUserAddress) return w.nimiq;
  return null;
}

function mapAccountType(raw: number): NimiqAccountType {
  if (raw in NimiqAccountType) {
    return raw as NimiqAccountType;
  }
  return NimiqAccountType.Basic;
}

export class NimiqWalletAdapter implements WalletService {
  private state: WalletConnectionState = "disconnected";
  private account: WalletAccount | null = null;
  private stateCallbacks: Set<(state: WalletConnectionState) => void> = new Set();
  private config = getWalletConfig("mainnet");
  private hubApi: NimiqHubApi | null = null;
  private nimiqPay: NimiqPayProvider | null = null;
  private useNativeProvider = false;

  async isAvailable(): Promise<boolean> {
    // First check for Nimiq Pay native provider
    const provider = getNimiqPayProvider();
    if (provider) {
      this.nimiqPay = provider;
      this.useNativeProvider = true;
      return true;
    }

    // Fall back to Hub API
    const api = await loadHubApi();
    if (api) {
      this.hubApi = api;
      return true;
    }
    if (typeof window !== "undefined" && "hubApi" in window) {
      this.hubApi = (window as Record<string, unknown>).hubApi as NimiqHubApi;
      return true;
    }
    return false;
  }

  getState(): WalletConnectionState {
    return this.state;
  }

  getAccount(): WalletAccount | null {
    return this.account;
  }

  async connect(appName?: string): Promise<WalletAccount> {
    if (this.state === "connected" && this.account) {
      return this.account;
    }
    this.setState("connecting");
    try {
      if (this.useNativeProvider && this.nimiqPay) {
        return await this.connectNimiqPay();
      }
      return await this.realConnect(appName || this.config.appName);
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  disconnect(): void {
    this.account = null;
    this.setState("disconnected");
    this.persistState();
  }

  async chooseAddress(appName?: string): Promise<WalletAccount> {
    const previousAccount = this.account;
    const previousState = this.state;
    this.setState("connecting");
    try {
      if (this.useNativeProvider && this.nimiqPay) {
        return await this.connectNimiqPay();
      }
      return await this.realConnect(appName || this.config.appName);
    } catch (error) {
      if (previousAccount) {
        this.account = previousAccount;
        this.setState(previousState);
      } else {
        this.setState("disconnected");
      }
      throw error;
    }
  }

  async sendTransaction(request: TransactionRequest): Promise<SignedTransaction> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    // Use Nimiq Pay native provider
    if (this.useNativeProvider && this.nimiqPay) {
      return this.sendTransactionNimiqPay(request);
    }

    // Fall back to Hub API
    if (!this.hubApi) {
      throw createWalletError("WALLET_NOT_FOUND");
    }
    try {
      const result = await this.hubApi.checkout({
        appName: request.appName,
        recipient: request.recipient,
        value: request.value,
        sender: this.account.address,
        fee: request.fee,
        validityDuration: request.validityDuration,
        extraData: request.extraData,
      });
      return this.mapSignedTransaction(result);
    } catch (error) {
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  async signTransaction(request: TransactionRequest): Promise<SignedTransaction> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }
    if (!request.validityStartHeight) {
      throw createWalletError("TRANSACTION_FAILED", undefined, "validityStartHeight is required");
    }

    // Use Nimiq Pay native provider
    if (this.useNativeProvider && this.nimiqPay) {
      return this.sendTransactionNimiqPay(request);
    }

    // Fall back to Hub API
    if (!this.hubApi) {
      throw createWalletError("WALLET_NOT_FOUND");
    }
    try {
      const result = await this.hubApi.checkout({
        appName: request.appName,
        recipient: request.recipient,
        value: request.value,
        sender: this.account.address,
        fee: request.fee,
        validityDuration: request.validityDuration,
        extraData: request.extraData,
      });
      return this.mapSignedTransaction(result);
    } catch (error) {
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  async signMessage(request: MessageSignRequest): Promise<SignedMessage> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    // Use Nimiq Pay native provider
    if (this.useNativeProvider && this.nimiqPay) {
      return this.signMessageNimiqPay(request);
    }

    // Fall back to Hub API
    if (!this.hubApi) {
      throw createWalletError("WALLET_NOT_FOUND");
    }
    try {
      const result = await this.hubApi.signMessage({
        appName: request.appName,
        message: request.message,
        signer: request.signer || this.account.address,
      });
      return {
        signer: result.signer,
        signerPublicKey: result.signerPublicKey,
        signature: result.signature,
      };
    } catch (error) {
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  getCapabilities(): WalletCapabilities {
    return {
      chooseAddress: true,
      checkout: true,
      signTransaction: true,
      signMessage: true,
    };
  }

  onStateChange(callback: (state: WalletConnectionState) => void): () => void {
    this.stateCallbacks.add(callback);
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  restoreSession(): WalletAccount | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(this.config.storeKey);
      if (stored) {
        const account = JSON.parse(stored) as WalletAccount;
        this.account = account;
        this.setState("connected");
        return account;
      }
    } catch {
      // ignore
    }
    return null;
  }

  async refreshBalance(): Promise<number | null> {
    return this.account?.balance ?? null;
  }

  private setState(state: WalletConnectionState): void {
    this.state = state;
    for (const cb of this.stateCallbacks) {
      cb(state);
    }
  }

  /**
   * Connect via Nimiq Pay native provider.
   * No popup needed — uses the in-app wallet directly.
   */
  private async connectNimiqPay(): Promise<WalletAccount> {
    if (!this.nimiqPay) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    try {
      // Try the modern request() API first
      if (this.nimiqPay.request) {
        const result = await this.nimiqPay.request({ method: "nimiq_getUserAddress" });
        if (result?.address) {
          const account: WalletAccount = {
            address: result.address,
            label: "Nimiq Pay",
          };
          this.account = account;
          this.setState("connected");
          this.persistState();
          return account;
        }
      }

      // Fall back to legacy nimiq.getUserAddress()
      if (this.nimiqPay.nimiq?.getUserAddress) {
        const result = await this.nimiqPay.nimiq.getUserAddress();
        if (result?.address) {
          const account: WalletAccount = {
            address: result.address,
            label: "Nimiq Pay",
          };
          this.account = account;
          this.setState("connected");
          this.persistState();
          return account;
        }
      }

      throw createWalletError("USER_REJECTED");
    } catch (error) {
      if (error instanceof Error && error.message.includes("WALLET_NOT_FOUND")) {
        throw error;
      }
      throw createWalletError("USER_REJECTED");
    }
  }

  /**
   * Send transaction via Nimiq Pay native provider.
   */
  private async sendTransactionNimiqPay(request: TransactionRequest): Promise<SignedTransaction> {
    if (!this.nimiqPay) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    try {
      const txData = {
        recipient: request.recipient,
        value: request.value,
        fee: request.fee || 0,
        extraData: request.extraData
          ? Array.from(
              request.extraData instanceof Uint8Array
                ? request.extraData
                : new TextEncoder().encode(request.extraData)
            )
          : undefined,
      };

      // Try modern request() API
      if (this.nimiqPay.request) {
        const result = await this.nimiqPay.request({
          method: "nimiq_signTransaction",
          params: txData,
        });
        if (result?.hash) {
          return {
            hash: result.hash,
            serializedTx: result.serializedTx || "",
            raw: {
              signerPublicKey: new Uint8Array(result.raw?.signerPublicKey || []),
              signature: new Uint8Array(result.raw?.signature || []),
              sender: result.raw?.sender || this.account?.address || "",
              senderType: mapAccountType(result.raw?.senderType || 0),
              recipient: result.raw?.recipient || request.recipient,
              recipientType: mapAccountType(result.raw?.recipientType || 0),
              value: result.raw?.value || request.value,
              fee: result.raw?.fee || request.fee || 0,
              validityStartHeight: result.raw?.validityStartHeight || 0,
              extraData: new Uint8Array(result.raw?.extraData || []),
              flags: result.raw?.flags || 0,
              networkId: result.raw?.networkId || 24,
            },
          };
        }
      }

      // Fall back to legacy nimiq.signTransaction()
      if (this.nimiqPay.nimiq?.signTransaction) {
        const result = await this.nimiqPay.nimiq.signTransaction(txData);
        if (result?.hash) {
          return {
            hash: result.hash,
            serializedTx: result.serializedTx || "",
            raw: {
              signerPublicKey: new Uint8Array(result.raw?.signerPublicKey || []),
              signature: new Uint8Array(result.raw?.signature || []),
              sender: result.raw?.sender || this.account?.address || "",
              senderType: mapAccountType(result.raw?.senderType || 0),
              recipient: result.raw?.recipient || request.recipient,
              recipientType: mapAccountType(result.raw?.recipientType || 0),
              value: result.raw?.value || request.value,
              fee: result.raw?.fee || request.fee || 0,
              validityStartHeight: result.raw?.validityStartHeight || 0,
              extraData: new Uint8Array(result.raw?.extraData || []),
              flags: result.raw?.flags || 0,
              networkId: result.raw?.networkId || 24,
            },
          };
        }
      }

      throw createWalletError("TRANSACTION_FAILED");
    } catch (error) {
      if (error instanceof Error && error.message.includes("WALLET_NOT_FOUND")) {
        throw error;
      }
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  /**
   * Sign message via Nimiq Pay native provider.
   */
  private async signMessageNimiqPay(request: MessageSignRequest): Promise<SignedMessage> {
    if (!this.nimiqPay) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    try {
      // Try modern request() API
      if (this.nimiqPay.request) {
        const result = await this.nimiqPay.request({
          method: "nimiq_signMessage",
          params: {
            message: request.message,
            signer: request.signer || this.account?.address,
          },
        });
        if (result?.signature) {
          return {
            signer: result.signer || this.account?.address || "",
            signerPublicKey: new Uint8Array(result.signerPublicKey || []),
            signature: new Uint8Array(result.signature),
          };
        }
      }

      throw createWalletError("USER_REJECTED");
    } catch (error) {
      if (error instanceof Error && error.message.includes("WALLET_NOT_FOUND")) {
        throw error;
      }
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  /**
   * Connect via Hub API signMessage - the Hub opens a popup, user picks wallet,
   * signs a message, and we get back the signer address.
   * This is the standard Nimiq Hub connection pattern for desktop browsers.
   */
  private async realConnect(appName: string): Promise<WalletAccount> {
    if (!this.hubApi) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    // signMessage opens the Hub popup - user picks wallet and signs
    const signResult = await this.hubApi.signMessage({
      appName,
      message: `Connect to ${appName}`,
    });

    if (!signResult?.signer) {
      throw createWalletError("USER_REJECTED");
    }

    const account: WalletAccount = {
      address: signResult.signer,
      label: "Nimiq Wallet",
    };

    this.account = account;
    this.setState("connected");
    this.persistState();

    // Try to fetch balance, but don't fail if RPC is unavailable (CORS)
    this.refreshBalance().catch(() => {});

    return account;
  }

  private mapSignedTransaction(result: {
    hash: string;
    serializedTx: string;
    raw: {
      signerPublicKey: Uint8Array;
      signature: Uint8Array;
      sender: string;
      senderType: number;
      recipient: string;
      recipientType: number;
      value: number;
      fee: number;
      validityStartHeight: number;
      extraData: Uint8Array;
      flags: number;
      networkId: number;
    };
  }): SignedTransaction {
    return {
      hash: result.hash,
      serializedTx: result.serializedTx,
      raw: {
        signerPublicKey: result.raw.signerPublicKey,
        signature: result.raw.signature,
        sender: result.raw.sender,
        senderType: mapAccountType(result.raw.senderType),
        recipient: result.raw.recipient,
        recipientType: mapAccountType(result.raw.recipientType),
        value: result.raw.value,
        fee: result.raw.fee,
        validityStartHeight: result.raw.validityStartHeight,
        extraData: result.raw.extraData,
        flags: result.raw.flags,
        networkId: result.raw.networkId,
      },
    };
  }

  private persistState(): void {
    if (typeof window === "undefined") return;
    try {
      if (this.account && this.state === "connected") {
        localStorage.setItem(this.config.storeKey, JSON.stringify(this.account));
      } else {
        localStorage.removeItem(this.config.storeKey);
      }
    } catch {
      // localStorage may be unavailable
    }
  }
}
