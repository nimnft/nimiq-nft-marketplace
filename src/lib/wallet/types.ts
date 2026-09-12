/**
 * Wallet types for NimiqNFT.
 *
 * These types map directly to the @nimiq/hub-api and @nimiq/core types.
 * See: https://nimiq.github.io/hub/api-reference
 * See: https://www.npmjs.com/package/@nimiq/core
 */

export type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type WalletErrorType =
  | "WALLET_NOT_FOUND"
  | "USER_REJECTED"
  | "NETWORK_ERROR"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_ADDRESS"
  | "TRANSACTION_FAILED"
  | "SIGNING_FAILED"
  | "UNKNOWN";

export interface WalletError extends Error {
  type: WalletErrorType;
  code?: number;
  originalError?: unknown;
}

/**
 * Nimiq account type enum.
 * Maps to Nimiq.AccountType in @nimiq/core.
 */
export enum NimiqAccountType {
  Basic = 0,
  Vesting = 1,
  HTLC = 2,
  Staking = 3,
}

export interface WalletAccount {
  address: string;
  label?: string;
  balance?: number; // Balance in Luna (1 NIM = 100,000 Luna)
}

/**
 * Signed transaction from @nimiq/hub-api checkout() or signTransaction().
 * See: https://nimiq.github.io/hub/api-reference/checkout#result
 */
export interface SignedTransaction {
  hash: string; // HEX transaction hash
  serializedTx: string; // HEX signed and serialized transaction
  raw: {
    signerPublicKey: Uint8Array;
    signature: Uint8Array;
    sender: string;
    senderType: NimiqAccountType;
    recipient: string;
    recipientType: NimiqAccountType;
    value: number;
    fee: number;
    validityStartHeight: number;
    extraData: Uint8Array;
    flags: number;
    networkId: number;
  };
}

/**
 * Signed message from @nimiq/hub-api signMessage().
 * See: https://nimiq.github.io/hub/api-reference/sign-message#result
 */
export interface SignedMessage {
  signer: string; // Human-readable address
  signerPublicKey: Uint8Array;
  signature: Uint8Array;
}

/**
 * Transaction request for hub-api checkout() or signTransaction().
 * See: https://nimiq.github.io/hub/api-reference/checkout#options
 */
export interface TransactionRequest {
  appName: string;
  recipient: string;
  value: number; // In Luna
  fee?: number; // In Luna, default 0
  sender?: string; // Required for signTransaction()
  validityStartHeight?: number; // Required for signTransaction()
  validityDuration?: number; // Blocks, max 120, default 120
  extraData?: string | Uint8Array;
}

export interface MessageSignRequest {
  appName: string;
  message: string | Uint8Array;
  signer?: string;
}

export interface WalletCapabilities {
  chooseAddress: boolean;
  checkout: boolean;
  signTransaction: boolean;
  signMessage: boolean;
}

/**
 * Nimiq JSON-RPC account response.
 * See: https://nimiq.github.io/developer-center/build/rpc-docs/
 */
export interface RpcAccount {
  address: string;
  balance: number; // In Luna
  type: NimiqAccountType;
  script: string;
  commitmentHash: string;
}

/**
 * Nimiq JSON-RPC block response.
 */
export interface RpcBlock {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  confirmations: number;
}

/**
 * Core wallet service interface.
 * Implementations wrap @nimiq/hub-api.
 * See: https://nimiq.github.io/hub/api-reference
 */
export interface WalletService {
  /** Check if wallet is available in the environment */
  isAvailable(): Promise<boolean>;

  /** Get current connection state */
  getState(): WalletConnectionState;

  /** Get connected account */
  getAccount(): WalletAccount | null;

  /** Connect wallet - opens Hub popup for address selection */
  connect(appName?: string): Promise<WalletAccount>;

  /** Disconnect wallet */
  disconnect(): void;

  /** Choose an address (reconnect to different address) */
  chooseAddress(appName?: string): Promise<WalletAccount>;

  /** Send a transaction (checkout) - signs and broadcasts to network */
  sendTransaction(request: TransactionRequest): Promise<SignedTransaction>;

  /** Sign a transaction without broadcasting */
  signTransaction(request: TransactionRequest): Promise<SignedTransaction>;

  /** Sign an arbitrary message */
  signMessage(request: MessageSignRequest): Promise<SignedMessage>;

  /** Get wallet capabilities */
  getCapabilities(): WalletCapabilities;

  /** Subscribe to state changes */
  onStateChange(callback: (state: WalletConnectionState) => void): () => void;

  /** Restore a persisted session if available */
  restoreSession(): WalletAccount | null;

  /** Refresh the connected account's balance */
  refreshBalance(): Promise<number | null>;
}

/**
 * Blockchain RPC service interface.
 * For querying chain state (balances, blocks, transactions).
 */
export interface BlockchainService {
  /** Get account balance in Luna */
  getBalance(address: string): Promise<number>;

  /** Get current block number */
  getBlockNumber(): Promise<number>;

  /** Get account info */
  getAccount(address: string): Promise<RpcAccount>;

  /** Send a raw signed transaction to the network */
  sendRawTransaction(serializedTx: string): Promise<string>;

  /** Get transaction receipt/status */
  getTransactionReceipt(txHash: string): Promise<{
    transactionHash: string;
    blockNumber: number;
    confirmations: number;
  } | null>;

  /** Get NIM price in USD (from external API) */
  getNimPrice(): Promise<number>;
}
