"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Image,
  FolderOpen,
  Users,
  AlertTriangle,
  Star,
  DollarSign,
  Activity,
  TrendingUp,
  ShoppingCart,
  Eye,
  Clock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalNfts: number;
  totalCollections: number;
  totalUsers: number;
  totalVolume: number;
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  pendingReports: number;
  activeListings: number;
  totalTransactions: number;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/nfts", label: "NFTs", icon: Image },
  { href: "/admin/collections", label: "Collections", icon: FolderOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  { href: "/admin/featured", label: "Featured", icon: Star },
  { href: "/admin/fees", label: "Marketplace Fees", icon: DollarSign },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock stats for demo
    setStats({
      totalNfts: 156,
      totalCollections: 12,
      totalUsers: 89,
      totalVolume: 245600,
      salesToday: 8,
      salesThisWeek: 47,
      salesThisMonth: 198,
      pendingReports: 2,
      activeListings: 89,
      totalTransactions: 1247,
    });
    setLoading(false);
  }, []);

  const statCards = stats
    ? [
        { label: "Total NFTs", value: stats.totalNfts, icon: Image, color: "text-primary" },
        { label: "Total Collections", value: stats.totalCollections, icon: FolderOpen, color: "text-accent" },
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
        { label: "Total Volume", value: `${stats.totalVolume.toLocaleString()} NIM`, icon: TrendingUp, color: "text-green-500" },
        { label: "Sales Today", value: stats.salesToday, icon: ShoppingCart, color: "text-primary" },
        { label: "Sales This Week", value: stats.salesThisWeek, icon: TrendingUp, color: "text-green-500" },
        { label: "Sales This Month", value: stats.salesThisMonth, icon: TrendingUp, color: "text-green-500" },
        { label: "Pending Reports", value: stats.pendingReports, icon: AlertTriangle, color: "text-red-500" },
        { label: "Active Listings", value: stats.activeListings, icon: Eye, color: "text-accent" },
        { label: "Total Transactions", value: stats.totalTransactions, icon: Activity, color: "text-blue-500" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-surface">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-text">Admin Panel</span>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/admin";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text">Dashboard</h1>
            <p className="text-text-secondary mt-2">
              Overview of marketplace statistics and activity
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-32 animate-shimmer rounded-2xl bg-surface" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl bg-bg flex items-center justify-center",
                          stat.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm text-text-muted">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-text">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-text">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-text">Review Reports</p>
                  <p className="text-sm text-text-muted">2 pending</p>
                </div>
              </Link>

              <Link
                href="/admin/featured"
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-text">Manage Featured</p>
                  <p className="text-sm text-text-muted">3 NFTs, 2 collections</p>
                </div>
              </Link>

              <Link
                href="/admin/fees"
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-text">Marketplace Fees</p>
                  <p className="text-sm text-text-muted">2.5% fee</p>
                </div>
              </Link>

              <Link
                href="/admin/activity"
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-text">Activity Log</p>
                  <p className="text-sm text-text-muted">Recent admin actions</p>
                </div>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
