"use client";

import { useState } from "react";
import { Copy, Settings, Share2 } from "lucide-react";
import type { User } from "@/types";
import { cn, formatAddress, generateGradient } from "@/lib/utils";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
}

export function ProfileHeader({ user, isOwnProfile = false }: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const gradient = generateGradient(user.address);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(user.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Followers", value: user.followersCount },
    { label: "Following", value: user.followingCount },
    { label: "NFTs", value: user.nftCount },
    { label: "Collections", value: user.collectionCount },
  ];

  return (
    <div className="relative">
      <div className="relative h-48 md:h-64 overflow-hidden rounded-t-2xl">
        <div className={cn("w-full h-full", gradient)} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
      </div>

      <div className="relative px-4 md:px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:gap-6 -mt-16 md:-mt-12">
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-surface overflow-hidden bg-surface mb-4 md:mb-0">
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-4xl font-bold text-white",
                gradient
              )}
            >
              {user.name?.[0] || formatAddress(user.address).slice(2, 4)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-text truncate">
                  {user.name || "Unnamed"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors"
                  >
                    <span className="font-mono">{formatAddress(user.address)}</span>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copied && (
                    <span className="text-xs text-primary">Copied!</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <button className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-hover transition-colors">
                      <Share2 className="w-4 h-4 mr-2 inline" />
                      Share
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-hover transition-colors">
                      <Settings className="w-4 h-4 mr-2 inline" />
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-hover transition-colors">
                      <Share2 className="w-4 h-4 mr-2 inline" />
                      Share
                    </button>
                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={cn(
                        "px-5 py-2 text-sm font-medium rounded-xl transition-colors",
                        isFollowing
                          ? "text-text bg-surface border border-border hover:bg-surface-hover"
                          : "text-primary-text bg-primary hover:bg-primary-hover"
                      )}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-hover transition-colors">
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {user.bio && (
          <p className="mt-6 text-text-secondary leading-relaxed max-w-2xl">
            {user.bio}
          </p>
        )}

        <div className="flex items-center gap-8 mt-6 pt-6 border-t border-border">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-text">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
