"use client";

import { Wallet, ChevronDown } from "lucide-react";
import { cn, formatAddress } from "@/lib/utils";

interface WalletButtonProps {
  connected?: boolean;
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function WalletButton({
  connected = false,
  address = "",
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const handleClick = () => {
    if (connected) {
      onDisconnect?.();
    } else {
      onConnect?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
        connected
          ? "bg-surface border border-border text-text hover:bg-surface-hover"
          : "bg-primary text-primary-text hover:bg-primary-hover"
      )}
    >
      <Wallet size={16} />
      {connected ? (
        <>
          {formatAddress(address)}
          <ChevronDown size={14} />
        </>
      ) : (
        "Connect Wallet"
      )}
    </button>
  );
}
