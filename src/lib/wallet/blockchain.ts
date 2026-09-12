/**
 * Nimiq Blockchain RPC Service
 *
 * Provides read/write access to the Nimiq blockchain via JSON-RPC.
 * See: https://nimiq.github.io/developer-center/build/rpc-docs/
 *
 * Public endpoints:
 * - Mainnet: https://api.nimiq.com
 * - Testnet: https://net.nimiq.com
 *
 * This service is chain-agnostic and can be used independently of the wallet.
 */

import type { BlockchainService, RpcAccount } from "./types";
import { NimiqAccountType } from "./types";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: unknown[];
  id: number;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  result?: T;
  error?: { code: number; message: string; data?: unknown };
  id: number;
}

export interface BlockchainConfig {
  rpcUrl: string;
  networkId: number;
  networkName: string;
  chainExplorer: string;
}

const NETWORK_CONFIGS: Record<string, BlockchainConfig> = {
  mainnet: {
    rpcUrl: "https://api.nimiq.com",
    networkId: 24,
    networkName: "Nimiq Mainnet",
    chainExplorer: "https://nimiq.watch",
  },
  testnet: {
    rpcUrl: "https://net.nimiq.com",
    networkId: 5,
    networkName: "Nimiq Testnet",
    chainExplorer: "https://testnet.nimiq.watch",
  },
};

/**
 * JSON-RPC caller for Nimiq nodes.
 * See: https://nimiq.github.io/developer-center/build/rpc-docs/
 */
export class NimiqBlockchainService implements BlockchainService {
  private config: BlockchainConfig;
  private requestId = 0;
  private cache = new Map<string, { data: unknown; expiry: number }>();

  constructor(network: "mainnet" | "testnet" = "mainnet") {
    this.config = NETWORK_CONFIGS[network];
  }

  /**
   * Make a JSON-RPC call to the Nimiq node.
   * See: https://nimiq.github.io/developer-center/build/rpc-docs/
   */
  private async rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: ++this.requestId,
    };

    const response = await fetch(this.config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status} ${response.statusText}`);
    }

    const json: JsonRpcResponse<T> = await response.json();

    if (json.error) {
      throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
    }

    return json.result as T;
  }

  /**
   * Get cached value or fetch fresh.
   */
  private async cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
    const data = await fetcher();
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  }

  /**
   * Get account balance in Luna.
   * RPC method: getBalance
   * See: https://nimiq.github.io/developer-center/build/rpc-docs/
   */
  async getBalance(address: string): Promise<number> {
    return this.cached(`balance:${address}`, 10_000, async () => {
      const result = await this.rpcCall<string>("getBalance", [address]);
      return Number(result);
    });
  }

  /**
   * Get current block number (chain head height).
   * RPC method: getBlockNumber
   */
  async getBlockNumber(): Promise<number> {
    return this.cached("blockNumber", 5_000, async () => {
      const result = await this.rpcCall<string>("getBlockNumber", []);
      return Number(result);
    });
  }

  /**
   * Get account info.
   * RPC method: getAccount
   */
  async getAccount(address: string): Promise<RpcAccount> {
    return this.cached(`account:${address}`, 15_000, async () => {
      const result = await this.rpcCall<{
        address: string;
        balance: string;
        type: number;
        script: string;
        commitment_hash: string;
      }>("getAccount", [address]);

      return {
        address: result.address,
        balance: Number(result.balance),
        type: result.type as NimiqAccountType,
        script: result.script,
        commitmentHash: result.commitment_hash,
      };
    });
  }

  /**
   * Send a raw signed transaction to the network.
   * RPC method: sendRawTransaction
   * See: https://nimiq.github.io/developer-center/build/rpc-docs/
   */
  async sendRawTransaction(serializedTx: string): Promise<string> {
    const result = await this.rpcCall<string>("sendRawTransaction", [serializedTx]);
    return result; // Returns tx hash
  }

  /**
   * Get transaction receipt/status.
   * RPC method: getTransactionReceipt
   */
  async getTransactionReceipt(txHash: string): Promise<{
    transactionHash: string;
    blockNumber: number;
    confirmations: number;
  } | null> {
    try {
      const result = await this.rpcCall<{
        transactionHash: string;
        blockNumber: string;
        confirmations: string;
      } | null>("getTransactionReceipt", [txHash]);

      if (!result) return null;

      return {
        transactionHash: result.transactionHash,
        blockNumber: Number(result.blockNumber),
        confirmations: Number(result.confirmations),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get NIM/USD price from CoinGecko.
   * Falls back to 0 if the API is unavailable.
   */
  async getNimPrice(): Promise<number> {
    return this.cached("nimPrice", 60_000, async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd",
        );
        const data = await response.json();
        return data?.["nimiq-2"]?.usd ?? 0;
      } catch {
        return 0;
      }
    });
  }

  /**
   * Get the network configuration.
   */
  getConfig(): BlockchainConfig {
    return { ...this.config };
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instances for mainnet and testnet.
 */
let mainnetInstance: NimiqBlockchainService | null = null;
let testnetInstance: NimiqBlockchainService | null = null;

export function getBlockchainService(
  network: "mainnet" | "testnet" = "mainnet",
): NimiqBlockchainService {
  if (network === "mainnet") {
    if (!mainnetInstance) mainnetInstance = new NimiqBlockchainService("mainnet");
    return mainnetInstance;
  }
  if (!testnetInstance) testnetInstance = new NimiqBlockchainService("testnet");
  return testnetInstance;
}
