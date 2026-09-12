"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, TrendingUp, DollarSign, Tag, ArrowRightLeft } from "lucide-react";
import { mockActivities } from "@/lib/mock-nfts";
import { fetchActivity } from "@/lib/user-store";
import { cn, formatNimiq } from "@/lib/utils";
import { ActivityItem } from "@/components/nft/ActivityItem";
import { ActivityFilters } from "@/components/nft/ActivityFilters";
import type { ActivityFilter } from "@/types/activity";
import { ACTIVITY_FILTER_MAP } from "@/types/activity";

export default function ActivityPage() {
  const [apiActivities, setApiActivities] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");

  useEffect(() => { fetchActivity().then(setApiActivities).catch(() => {}); }, []);

  const filteredActivities = useMemo(() => {
    const allActivities = [...apiActivities, ...mockActivities];
    const filterTypes = ACTIVITY_FILTER_MAP[activeFilter];
    return allActivities
      .filter((a) => filterTypes.includes(a.type))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activeFilter]);

  const filterCounts = useMemo(() => {
    const allActivities = [...apiActivities, ...mockActivities];
    const counts: Record<ActivityFilter, number> = {
      all: allActivities.length,
      sales: 0,
      listings: 0,
      transfers: 0,
      mints: 0,
      offers: 0,
      auctions: 0,
    };

    for (const activity of allActivities) {
      if (activity.type === "sale") counts.sales++;
      if (activity.type === "list") counts.listings++;
      if (activity.type === "transfer") counts.transfers++;
      if (activity.type === "mint") counts.mints++;
      if (["offer", "offer_accepted", "offer_cancelled"].includes(activity.type)) counts.offers++;
      if (["auction_started", "auction_ended", "bid"].includes(activity.type)) counts.auctions++;
    }

    return counts;
  }, []);

  const allActivities = useMemo(() => [...apiActivities, ...mockActivities], []);
  const salesActivities = allActivities.filter((a) => a.type === "sale");
  const totalVolume = salesActivities.reduce((sum, a) => sum + a.price, 0);
  const totalSales = salesActivities.length;
  const activeListings = allActivities.filter((a) => a.type === "list").length;

  const stats = [
    {
      label: "Total Volume",
      value: `${formatNimiq(totalVolume)} NIM`,
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Total Sales",
      value: totalSales.toString(),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      label: "Active Listings",
      value: activeListings.toString(),
      icon: Tag,
      color: "text-accent",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Activity</h1>
          <p className="text-text-secondary mt-2">
            Track all transactions and events on the marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl bg-surface flex items-center justify-center",
                      stat.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-text-secondary">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-6">
          <ActivityFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {filteredActivities.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Activity className="w-12 h-12 mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">
                No activity found for this filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
