/**
 * Nimiq Wallet Adapter
 *
 * Two connection methods:
 * 1. Nimiq Pay Mini App: Uses @nimiq/mini-app-sdk (window.nimiq provider)
 *    - No popup needed, native wallet UI in the app
 *    - Used when running inside Nimiq Pay's Mini App browser
 * 2. Hub API fallback: Uses @nimiq/hub-api (popup to hub.nimiq.com)
 *    - Used on desktop with Nimiq Wallet browser extension
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
  signMessage: (opts: {
    appName: string;
    message: string | Uint8Array;
    signer?: string;
  }) => Promise<{
    signer: string;
    signerPublicKey: Uint8Array;
    signature: Uint8Array;
  }>;
  checkout: (opts: {
    appName: string;
    recipient: string;
    value: number;
    sender?: string;
    fee?: number;
    validityDuration?: number;
    extraData?: string | Uint8Array;
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
}

/** NimiqProvider from @nimiq/mini-app-sdk */
interface MiniAppProvider {
  listAccounts(): Promise<string[] | { error: { message: string } }>;
  sign(message: string | Uint8Array): Promise<Uint8Array | { error: { message: string } }>;
  sendBasicTransaction(tx: {
    recipient: string;
    value: number;
    fee?: number;
    extraData?: number[];
  }): Promise<{ hash: string } | { error: { message: string } }>;
}

function mapAccountType(raw: number): NimiqAccountType {
  if (raw in NimiqAccountType) return raw as NimiqAccountType;
  return NimiqAccountType.Basic;
}

// ─── Hub API (desktop fallback) ─────────────────────────────

let hubApiModule: NimiqHubApi | null = null;
let hubLoadPromise: Promise<NimiqHubApi> | null = null;

async function ensureHubApi(): Promise<NimiqHubApi> {
  if (hubApiModule) return hubApiModule;
  if (hubLoadPromise) return hubLoadPromise;

  hubLoadPromise = (async () => {
    const mod = await import("@nimiq/hub-api");
    const HubApi = mod.default;
    const config = getWalletConfig("mainnet");
    hubApiModule = new HubApi(config.hubUrl);
    return hubApiModule;
  })();

  return hubLoadPromise;
}

// ─── Mini App SDK (Nimiq Pay native) ───────────────────────

let miniAppProvider: MiniAppProvider | null = null;
let miniAppAttempted = false;

async function tryInitMiniApp(): Promise<MiniAppProvider | null> {
  if (miniAppAttempted) return miniAppProvider;
  miniAppAttempted = true;

  try {
    const { init } = await import("@nimiq/mini-app-sdk");
    const provider = await init({ timeout: 5000 });
    miniAppProvider = provider as unknown as MiniAppProvider;
    return miniAppProvider;
  } catch {
    return null;
  }
}

// ─── Adapter ───────────────────────────────────────────────

export class NimiqWalletAdapter implements WalletService {
  private state: WalletConnectionState = "disconnected";
  private account: WalletAccount | null = null;
  private stateCallbacks: Set<(state: WalletConnectionState) => void> = new Set();
  private config = getWalletConfig("mainnet");
  private hubApi: NimiqHubApi | null = null;
  private miniApp: MiniAppProvider | null = null;
  private connectionMethod: "miniapp" | "hub" | null = null;

  async isAvailable(): Promise<boolean> {
    // Try Mini App SDK first (Nimiq Pay)
    const miniProvider = await tryInitMiniApp();
    if (miniProvider) {
      this.miniApp = miniProvider;
      this.connectionMethod = "miniapp";
      return true;
    }

    // Fall back to Hub API (desktop with extension)
    try {
      const api = await ensureHubApi();
      this.hubApi = api;
      this.connectionMethod = "hub";
      return true;
    } catch {
      return false;
    }
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
      // Ensure we have a connection method
      if (!this.connectionMethod) {
        await this.isAvailable();
      }

      if (this.connectionMethod === "miniapp" && this.miniApp) {
        return await this.connectMiniApp();
      }
      return await this.connectHub(appName || this.config.appName);
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
    return this.connect(appName);
  }

  async sendTransaction(request: TransactionRequest): Promise<SignedTransaction> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    // Mini App: use sendBasicTransaction
    if (this.connectionMethod === "miniapp" && this.miniApp) {
      return this.sendTransactionMiniApp(request);
    }

    // Hub API: use checkout
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
      return this.mapHubTransaction(result);
    } catch (error) {
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  async signTransaction(request: TransactionRequest): Promise<SignedTransaction> {
    return this.sendTransaction(request);
  }

  async signMessage(request: MessageSignRequest): Promise<SignedMessage> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }

    // Mini App: use provider.sign()
    if (this.connectionMethod === "miniapp" && this.miniApp) {
      try {
        const msg = typeof request.message === "string"
          ? request.message
          : new TextDecoder().decode(request.message);
        const result = await this.miniApp.sign(msg);
        if (result && typeof result === "object" && "error" in result) {
          throw createWalletError("USER_REJECTED");
        }
        const sigBytes = result as Uint8Array;
        return {
          signer: this.account.address,
          signerPublicKey: new Uint8Array(),
          signature: sigBytes,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("WALLET_NOT_FOUND")) throw error;
        throw createWalletError("USER_REJECTED");
      }
    }

    // Hub API
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
    return () => this.stateCallbacks.delete(callback);
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
    } catch {}
    return null;
  }

  async refreshBalance(): Promise<number | null> {
    return this.account?.balance ?? null;
  }

  private setState(state: WalletConnectionState): void {
    this.state = state;
    for (const cb of this.stateCallbacks) cb(state);
  }

  // ─── Mini App connect ────────────────────────────────

  private async connectMiniApp(): Promise<WalletAccount> {
    const provider = this.miniApp!;

    try {
      const result = await provider.listAccounts();
      if (result && typeof result === "object" && "error" in result) {
        throw createWalletError("USER_REJECTED");
      }
      const accounts = result as string[];
      if (!accounts || accounts.length === 0) {
        throw createWalletError("USER_REJECTED");
      }

      const account: WalletAccount = {
        address: accounts[0],
        label: "Nimiq Pay",
      };

      this.account = account;
      this.setState("connected");
      this.persistState();
      return account;
    } catch (error: any) {
      if (error?.type === "user-aborted" || error?.message?.includes("aborted")) {
        throw createWalletError("USER_REJECTED");
      }
      throw error;
    }
  }

  // ─── Mini App transaction ────────────────────────────

  private async sendTransactionMiniApp(request: TransactionRequest): Promise<SignedTransaction> {
    const provider = this.miniApp!;

    try {
      const txData: any = {
        recipient: request.recipient,
        value: request.value,
        fee: request.fee || 0,
      };

      if (request.extraData) {
        if (request.extraData instanceof Uint8Array) {
          txData.extraData = Array.from(request.extraData);
        } else if (typeof request.extraData === "string") {
          txData.extraData = Array.from(new TextEncoder().encode(request.extraData));
        }
      }

      const result = await provider.sendBasicTransaction(txData);
      if (result && typeof result === "object" && "error" in result) {
        throw createWalletError("TRANSACTION_FAILED");
      }

      const txResult = result as { hash: string };
      return {
        hash: txResult.hash,
        serializedTx: "",
        raw: {
          signerPublicKey: new Uint8Array(),
          signature: new Uint8Array(),
          sender: this.account?.address || "",
          senderType: NimiqAccountType.Basic,
          recipient: request.recipient,
          recipientType: NimiqAccountType.Basic,
          value: request.value,
          fee: request.fee || 0,
          validityStartHeight: 0,
          extraData: new Uint8Array(),
          flags: 0,
          networkId: 24,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("WALLET_NOT_FOUND")) throw error;
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  // ─── Hub API connect ─────────────────────────────────

  private async connectHub(appName: string): Promise<WalletAccount> {
    if (!this.hubApi) {
      this.hubApi = await ensureHubApi();
    }

    try {
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
      return account;
    } catch (error: any) {
      const errorType = classifyError(error);
      throw createWalletError(errorType, error);
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  private mapHubTransaction(result: {
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
    } catch {}
  }
}
