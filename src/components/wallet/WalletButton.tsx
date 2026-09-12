"use client";

import { useState, useRef, useEffect } from "react";
import {
  Wallet,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-provider";
import { cn } from "@/lib/utils";

export function WalletButton() {
  const {
    state,
    account,
    isConnecting,
    error,
    connect,
    disconnect,
    chooseAddress,
    shortenAddress,
    copyAddress,
    addressCopied,
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (error && state === "error") {
    return (
      <button
        onClick={() => {
          connect();
        }}
        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20"
      >
        <AlertCircle size={16} />
        <span className="max-w-[120px] truncate">{error}</span>
      </button>
    );
  }

  if (isConnecting) {
    return (
      <button
        disabled
        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/50 text-primary-text cursor-wait"
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  if (state === "connected" && account) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-surface border border-border text-text hover:bg-surface-hover"
        >
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          {shortenAddress(account.address)}
          <ChevronDown
            size={14}
            className={cn(
              "transition-transform",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-surface shadow-xl animate-fade-in z-50">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wallet size={18} className="text-primary-text" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">
                    {account.label || "Connected Wallet"}
                  </p>
                  <p className="text-xs text-text-muted">
                    Nimiq Mainnet
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-border">
              <p className="text-xs text-text-muted mb-1.5">Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-text bg-bg px-2 py-1 rounded-lg flex-1 truncate">
                  {account.address}
                </code>
                <button
                  onClick={() => copyAddress()}
                  className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  title="Copy address"
                >
                  {addressCopied ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} className="text-text-muted" />
                  )}
                </button>
              </div>
            </div>

            {account.balance !== undefined && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-muted mb-0.5">Balance</p>
                <p className="text-sm font-semibold text-text">
                  {(account.balance / 100_000).toLocaleString()} NIM
                </p>
              </div>
            )}

            <div className="p-2">
              <button
                onClick={() => {
                  chooseAddress();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
              >
                <RefreshCw size={15} />
                Switch Address
              </button>
              <a
                href={`https://nimiq.watch/#${account.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
              >
                <ExternalLink size={15} />
                View on Explorer
              </a>
              <button
                onClick={() => {
                  disconnect();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut size={15} />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-primary text-primary-text hover:bg-primary-hover"
    >
      <Wallet size={16} />
      Connect Wallet
    </button>
  );
}

export function MobileWalletButton() {
  const { state, account, isConnecting, error, connect, disconnect, shortenAddress } =
    useWallet();

  if (isConnecting) {
    return (
      <button
        disabled
        className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/50 text-primary-text cursor-wait w-full"
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  if (error && state === "error") {
    return (
      <button
        onClick={connect}
        className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 w-full"
      >
        <AlertCircle size={16} />
        Retry Connection
      </button>
    );
  }

  if (state === "connected" && account) {
    return (
      <button
        onClick={disconnect}
        className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface border border-border text-text w-full"
      >
        <div className="w-2 h-2 rounded-full bg-success" />
        {shortenAddress(account.address)}
        <LogOut size={14} className="ml-auto" />
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover w-full"
    >
      <Wallet size={16} />
      Connect Wallet
    </button>
  );
}
