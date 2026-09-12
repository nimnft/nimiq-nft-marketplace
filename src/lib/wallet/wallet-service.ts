import { NimiqWalletAdapter } from "./nimiq-adapter";
import type { WalletService } from "./types";

let instance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!instance) {
    instance = new NimiqWalletAdapter();
  }
  return instance;
}

export type { WalletService } from "./types";
