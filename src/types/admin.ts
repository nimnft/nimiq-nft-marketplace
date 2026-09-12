/**
 * Admin Types and Role-Based Access Control
 *
 * Defines admin roles, permissions, and access control for the marketplace.
 */

// ============================================================
// Admin Roles
// ============================================================

export type AdminRole = "super_admin" | "admin" | "moderator" | "viewer";

export interface AdminPermissions {
  // Dashboard
  viewDashboard: boolean;

  // NFT Management
  viewNfts: boolean;
  editNfts: boolean;
  deleteNfts: boolean;
  featureNfts: boolean;

  // Collection Management
  viewCollections: boolean;
  editCollections: boolean;
  deleteCollections: boolean;
  featureCollections: boolean;

  // User Management
  viewUsers: boolean;
  editUsers: boolean;
  banUsers: boolean;

  // Reports
  viewReports: boolean;
  handleReports: boolean;

  // Fees
  viewFees: boolean;
  editFees: boolean;

  // Activity
  viewActivity: boolean;

  // Settings
  viewSettings: boolean;
  editSettings: boolean;
}

// ============================================================
// Role Permissions Matrix
// ============================================================

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    viewDashboard: true,
    viewNfts: true,
    editNfts: true,
    deleteNfts: true,
    featureNfts: true,
    viewCollections: true,
    editCollections: true,
    deleteCollections: true,
    featureCollections: true,
    viewUsers: true,
    editUsers: true,
    banUsers: true,
    viewReports: true,
    handleReports: true,
    viewFees: true,
    editFees: true,
    viewActivity: true,
    viewSettings: true,
    editSettings: true,
  },
  admin: {
    viewDashboard: true,
    viewNfts: true,
    editNfts: true,
    deleteNfts: false,
    featureNfts: true,
    viewCollections: true,
    editCollections: true,
    deleteCollections: false,
    featureCollections: true,
    viewUsers: true,
    editUsers: true,
    banUsers: true,
    viewReports: true,
    handleReports: true,
    viewFees: true,
    editFees: false,
    viewActivity: true,
    viewSettings: true,
    editSettings: false,
  },
  moderator: {
    viewDashboard: true,
    viewNfts: true,
    editNfts: false,
    deleteNfts: false,
    featureNfts: false,
    viewCollections: true,
    editCollections: false,
    deleteCollections: false,
    featureCollections: false,
    viewUsers: true,
    editUsers: false,
    banUsers: false,
    viewReports: true,
    handleReports: true,
    viewFees: false,
    editFees: false,
    viewActivity: true,
    viewSettings: false,
    editSettings: false,
  },
  viewer: {
    viewDashboard: true,
    viewNfts: true,
    editNfts: false,
    deleteNfts: false,
    featureNfts: false,
    viewCollections: true,
    editCollections: false,
    deleteCollections: false,
    featureCollections: false,
    viewUsers: false,
    editUsers: false,
    banUsers: false,
    viewReports: false,
    handleReports: false,
    viewFees: false,
    editFees: false,
    viewActivity: true,
    viewSettings: false,
    editSettings: false,
  },
};

// ============================================================
// Admin User
// ============================================================

export interface AdminUser {
  id: string;
  address: string; // Nimiq wallet address
  role: AdminRole;
  permissions: AdminPermissions;
  label?: string; // Display name for admin
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

// ============================================================
// Admin Session
// ============================================================

export interface AdminSession {
  adminId: string;
  address: string;
  role: AdminRole;
  permissions: AdminPermissions;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// ============================================================
// Report Types
// ============================================================

export type ReportReason =
  | "spam"
  | "scam"
  | "inappropriate"
  | "copyright"
  | "fake"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export type ReportTargetType = "nft" | "user" | "collection";

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterAddress: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  handledBy?: string; // Admin ID
  handledAt?: string;
  createdAt: string;
}

// ============================================================
// Admin Statistics
// ============================================================

export interface AdminStats {
  totalNfts: number;
  totalCollections: number;
  totalUsers: number;
  totalVolume: number;
  totalSales: number;
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  pendingReports: number;
  activeListings: number;
  totalTransactions: number;
}

// ============================================================
// Marketplace Fee Configuration
// ============================================================

export interface MarketplaceFeeConfig {
  id: string;
  marketplaceFeePercent: number;
  minRoyaltyPercent: number;
  maxRoyaltyPercent: number;
  minListingPrice: number; // In Luna
  maxListingPrice: number; // In Luna
  minListingDuration: number; // Days
  maxListingDuration: number; // Days
  updatedAt: string;
  updatedBy: string;
}

// ============================================================
// Admin Activity Log
// ============================================================

export type AdminAction =
  | "feature_nft"
  | "unfeature_nft"
  | "feature_collection"
  | "unfeature_collection"
  | "ban_user"
  | "unban_user"
  | "handle_report"
  | "update_fees"
  | "update_settings"
  | "login"
  | "logout";

export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminAddress: string;
  action: AdminAction;
  targetType?: ReportTargetType;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// Permission Check Helpers
// ============================================================

export function hasPermission(
  permissions: AdminPermissions,
  permission: keyof AdminPermissions
): boolean {
  return permissions[permission] === true;
}

export function hasAnyPermission(
  permissions: AdminPermissions,
  permissionList: (keyof AdminPermissions)[]
): boolean {
  return permissionList.some((p) => permissions[p] === true);
}

export function getRoleDisplayName(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

export function getRoleBadgeColor(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "admin":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "moderator":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "viewer":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}
