/**
 * Admin Store
 *
 * In-memory store for admin data. Replace with real database for production.
 */

import type {
  AdminUser,
  Report,
  MarketplaceFeeConfig,
  AdminActivityLog,
  ReportStatus,
} from "@/types/admin";
import { ROLE_PERMISSIONS } from "@/types/admin";
import { mockNFTs } from "@/lib/mock-nfts";
import { mockUsers, mockCollections } from "@/lib/mock-users";

const mockAdminUsers: AdminUser[] = [
  {
    id: "admin-001",
    address: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
    role: "super_admin",
    permissions: ROLE_PERMISSIONS.super_admin,
    label: "Super Admin",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isActive: true,
  },
  {
    id: "admin-002",
    address: "NQ07 0000 0000 0000 0000 0000 0000 0000 0001",
    role: "admin",
    permissions: ROLE_PERMISSIONS.admin,
    label: "Marketplace Admin",
    createdAt: "2023-02-15T00:00:00Z",
    updatedAt: "2023-02-15T00:00:00Z",
    isActive: true,
  },
  {
    id: "admin-003",
    address: "NQ07 0000 0000 0000 0000 0000 0000 0000 0002",
    role: "moderator",
    permissions: ROLE_PERMISSIONS.moderator,
    label: "Content Moderator",
    createdAt: "2023-03-10T00:00:00Z",
    updatedAt: "2023-03-10T00:00:00Z",
    isActive: true,
  },
];

const mockReports: Report[] = [
  {
    id: "report-001",
    targetType: "nft",
    targetId: "nft-003",
    reporterAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0010",
    reason: "scam",
    description: "This NFT appears to be a copy of another artist's work.",
    status: "pending",
    createdAt: "2023-07-25T10:00:00Z",
  },
  {
    id: "report-002",
    targetType: "user",
    targetId: "user-004",
    reporterAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0011",
    reason: "spam",
    description: "User is posting spam listings repeatedly.",
    status: "pending",
    createdAt: "2023-07-26T14:30:00Z",
  },
  {
    id: "report-003",
    targetType: "nft",
    targetId: "nft-007",
    reporterAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0012",
    reason: "inappropriate",
    description: "This NFT contains inappropriate content.",
    status: "reviewed",
    handledBy: "admin-003",
    handledAt: "2023-07-27T09:00:00Z",
    createdAt: "2023-07-26T18:00:00Z",
  },
];

const mockFeeConfig: MarketplaceFeeConfig = {
  id: "fee-config-1",
  marketplaceFeePercent: 2.5,
  minRoyaltyPercent: 0,
  maxRoyaltyPercent: 10,
  minListingPrice: 100,
  maxListingPrice: 100000000000,
  minListingDuration: 1,
  maxListingDuration: 365,
  updatedAt: "2023-01-01T00:00:00Z",
  updatedBy: "admin-001",
};

const mockAdminLogs: AdminActivityLog[] = [
  {
    id: "log-001",
    adminId: "admin-001",
    adminAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
    action: "login",
    createdAt: "2023-07-28T08:00:00Z",
  },
  {
    id: "log-002",
    adminId: "admin-003",
    adminAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0002",
    action: "handle_report",
    targetType: "nft",
    targetId: "nft-007",
    details: { resolution: "No violation found" },
    createdAt: "2023-07-27T09:00:00Z",
  },
  {
    id: "log-003",
    adminId: "admin-001",
    adminAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
    action: "feature_nft",
    targetType: "nft",
    targetId: "nft-001",
    createdAt: "2023-07-25T12:00:00Z",
  },
];

const featuredNfts = new Set<string>(["nft-001", "nft-003", "nft-006"]);
const featuredCollections = new Set<string>(["col-001", "col-003"]);

class AdminStore {
  getAdminByAddress(address: string): AdminUser | undefined {
    return mockAdminUsers.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );
  }

  getAdminById(id: string): AdminUser | undefined {
    return mockAdminUsers.find((a) => a.id === id);
  }

  getAllAdmins(): AdminUser[] {
    return [...mockAdminUsers];
  }

  getReports(status?: ReportStatus): Report[] {
    if (status) {
      return mockReports.filter((r) => r.status === status);
    }
    return [...mockReports];
  }

  getReport(id: string): Report | undefined {
    return mockReports.find((r) => r.id === id);
  }

  updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const report = mockReports.find((r) => r.id === id);
    if (!report) return undefined;
    Object.assign(report, updates);
    return report;
  }

  getFeaturedNfts(): string[] {
    return Array.from(featuredNfts);
  }

  toggleFeaturedNft(nftId: string): boolean {
    if (featuredNfts.has(nftId)) {
      featuredNfts.delete(nftId);
      return false;
    }
    featuredNfts.add(nftId);
    return true;
  }

  getFeaturedCollections(): string[] {
    return Array.from(featuredCollections);
  }

  toggleFeaturedCollection(collectionId: string): boolean {
    if (featuredCollections.has(collectionId)) {
      featuredCollections.delete(collectionId);
      return false;
    }
    featuredCollections.add(collectionId);
    return true;
  }

  getFeeConfig(): MarketplaceFeeConfig {
    return { ...mockFeeConfig };
  }

  updateFeeConfig(
    updates: Partial<MarketplaceFeeConfig>,
    adminId: string
  ): MarketplaceFeeConfig {
    Object.assign(mockFeeConfig, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    });
    return { ...mockFeeConfig };
  }

  getAdminLogs(limit = 50): AdminActivityLog[] {
    return mockAdminLogs
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  addAdminLog(log: Omit<AdminActivityLog, "id" | "createdAt">): void {
    mockAdminLogs.push({
      ...log,
      id: `log-${String(mockAdminLogs.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
    });
  }

  getStats() {
    const salesActivities = mockNFTs.filter((nft) => !nft.listed);
    const totalVolume = salesActivities.reduce((sum, nft) => sum + (nft.price || 0), 0);

    return {
      totalNfts: mockNFTs.length,
      totalCollections: mockCollections.length,
      totalUsers: mockUsers.length,
      totalVolume,
      totalSales: salesActivities.length,
      salesToday: 3,
      salesThisWeek: 15,
      salesThisMonth: 67,
      pendingReports: mockReports.filter((r) => r.status === "pending").length,
      activeListings: mockNFTs.filter((nft) => nft.listed).length,
      totalTransactions: 234,
    };
  }
}

let adminStoreInstance: AdminStore | null = null;

export function getAdminStore(): AdminStore {
  if (!adminStoreInstance) {
    adminStoreInstance = new AdminStore();
  }
  return adminStoreInstance;
}
