/**
 * Nimiq Wallet Adapter
 *
 * Works in:
 * - Desktop browsers: Hub API popup to hub.nimiq.com
 * - Nimiq Pay app: App intercepts hub.nimiq.com calls natively
 * - Nimiq Pay app (native provider): Direct injection via window.nimiqPay
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

function mapAccountType(raw: number): NimiqAccountType {
  if (raw in NimiqAccountType) {
    return raw as NimiqAccountType;
  }
  return NimiqAccountType.Basic;
}

function isNimiqPayBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("NimiqPay") || ua.includes("Nimiq Pay") || ua.includes("nimiqpay");
}

let hubApiModule: NimiqHubApi | null = null;
let hubLoadPromise: Promise<NimiqHubApi> | null = null;

async function ensureHubApi(): Promise<NimiqHubApi> {
  if (hubApiModule) return hubApiModule;
  if (hubLoadPromise) return hubLoadPromise;

  hubLoadPromise = (async () => {
    const mod = await import("@nimiq/hub-api");
    const HubApi = mod.default;
    const config = getWalletConfig("mainnet");
    const hub = new HubApi(config.hubUrl);
    hubApiModule = hub;
    return hub;
  })();

  return hubLoadPromise;
}

export class NimiqWalletAdapter implements WalletService {
  private state: WalletConnectionState = "disconnected";
  private account: WalletAccount | null = null;
  private stateCallbacks: Set<(state: WalletConnectionState) => void> = new Set();
  private config = getWalletConfig("mainnet");
  private hubApi: NimiqHubApi | null = null;

  async isAvailable(): Promise<boolean> {
    try {
      const api = await ensureHubApi();
      this.hubApi = api;
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
      if (!this.hubApi) {
        this.hubApi = await ensureHubApi();
      }
      const account = await this.realConnect(appName || this.config.appName);
      return account;
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
      if (!this.hubApi) {
        this.hubApi = await ensureHubApi();
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
    return this.sendTransaction(request);
  }

  async signMessage(request: MessageSignRequest): Promise<SignedMessage> {
    if (this.state !== "connected" || !this.account) {
      throw createWalletError("WALLET_NOT_FOUND");
    }
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
   * Connect via Hub API signMessage.
   *
   * Desktop browser: Opens hub.nimiq.com popup → user signs → returns signer address.
   * Nimiq Pay app: hub.nimiq.com is intercepted by the app → native wallet UI → returns signer address.
   *
   * Both flows use the same Hub API call. The difference is handled by the environment.
   */
  private async realConnect(appName: string): Promise<WalletAccount> {
    const hub = this.hubApi!;

    try {
      const signResult = await hub.signMessage({
        appName,
        message: `Connect to ${appName}`,
      });

      if (!signResult?.signer) {
        throw createWalletError("USER_REJECTED");
      }

      const account: WalletAccount = {
        address: signResult.signer,
        label: isNimiqPayBrowser() ? "Nimiq Pay" : "Nimiq Wallet",
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
