"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getWalletService, getNftService } from "./wallet";
import type {
  WalletAccount,
  WalletConnectionState,
  WalletService,
} from "./wallet";
import type { NftService } from "./wallet";

interface WalletContextValue {
  state: WalletConnectionState;
  account: WalletAccount | null;
  isAvailable: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  chooseAddress: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  shortenAddress: (address: string) => string;
  copyAddress: () => Promise<boolean>;
  addressCopied: boolean;
  service: WalletService;
  nftService: NftService;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const serviceRef = useRef<WalletService>(getWalletService());
  const nftServiceRef = useRef<NftService>(getNftService("mainnet"));
  const [state, setState] = useState<WalletConnectionState>("disconnected");
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnecting = state === "connecting";

  useEffect(() => {
    const service = serviceRef.current;

    // Restore persisted session on mount
    const stored = service.restoreSession();
    if (stored) {
      setAccount(stored);
      setState("connected");
    }

    service.isAvailable().then((available) => {
      setIsAvailable(available);
      if (!available && !stored) {
        setError("Nimiq Hub not found. Please install it from https://nimiq.com/wallet");
      }
    });

    const unsubscribe = service.onStateChange((newState) => {
      setState(newState);
      if (newState === "connected") {
        const acct = service.getAccount();
        setAccount(acct);
        setError(null);
      } else if (newState === "disconnected") {
        setAccount(null);
        setError(null);
      } else if (newState === "error") {
        setError("Wallet connection failed. Please try again.");
      }
    });

    nftServiceRef.current.setWallet(service);

    return () => {
      unsubscribe();
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const result = await serviceRef.current.connect();
      setAccount(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
    }
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current.disconnect();
    setAccount(null);
    setState("disconnected");
    setError(null);
  }, []);

  const chooseAddress = useCallback(async () => {
    setError(null);
    try {
      const result = await serviceRef.current.chooseAddress();
      setAccount(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to choose address";
      setError(message);
      if (account) {
        setState("connected");
      }
    }
  }, [account]);

  const refreshBalance = useCallback(async () => {
    if (!account?.address) return;
    try {
      const balance = await serviceRef.current.refreshBalance();
      if (balance !== null) {
        setAccount((prev) =>
          prev ? { ...prev, balance } : null,
        );
      }
    } catch {
      // Balance refresh failed
    }
  }, [account]);

  const shortenAddress = useCallback((address: string): string => {
    if (!address) return "";
    const clean = address.replace(/\s/g, "");
    if (clean.length <= 12) return clean;
    return clean.slice(0, 6) + "..." + clean.slice(-4);
  }, []);

  const copyAddress = useCallback(async (): Promise<boolean> => {
    if (!account?.address) return false;
    try {
      await navigator.clipboard.writeText(account.address);
      setAddressCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setAddressCopied(false);
      }, 2000);
      return true;
    } catch {
      return false;
    }
  }, [account]);

  const value = useMemo<WalletContextValue>(
    () => ({
      state,
      account,
      isAvailable,
      isConnecting,
      error,
      connect,
      disconnect,
      chooseAddress,
      refreshBalance,
      shortenAddress,
      copyAddress,
      addressCopied,
      service: serviceRef.current,
      nftService: nftServiceRef.current,
    }),
    [
      state,
      account,
      isAvailable,
      isConnecting,
      error,
      connect,
      disconnect,
      chooseAddress,
      refreshBalance,
      shortenAddress,
      copyAddress,
      addressCopied,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
