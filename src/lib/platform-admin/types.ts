import type { Database, Json } from "@/types/supabase";
import type { PlatformRole } from "@/lib/platform-admin/constants";

export type PlatformAdminRow =
  Database["public"]["Tables"]["platform_admins"]["Row"];
export type PlatformLicenseRow =
  Database["public"]["Tables"]["platform_licenses"]["Row"];
export type PlatformFeatureFlagRow =
  Database["public"]["Tables"]["platform_feature_flags"]["Row"];
export type PlatformAnnouncementRow =
  Database["public"]["Tables"]["platform_announcements"]["Row"];
export type PlatformAuditEventRow =
  Database["public"]["Tables"]["platform_audit_events"]["Row"];
export type PlatformImpersonationRow =
  Database["public"]["Tables"]["platform_impersonation_sessions"]["Row"];
export type PlatformNotificationRow =
  Database["public"]["Tables"]["platform_notifications"]["Row"];
export type PlatformUserControlRow =
  Database["public"]["Tables"]["platform_user_controls"]["Row"];
export type PlatformSettingRow =
  Database["public"]["Tables"]["platform_settings"]["Row"];
export type PlatformBackupJobRow =
  Database["public"]["Tables"]["platform_backup_jobs"]["Row"];

export type PlatformAdminContext = {
  userId: string;
  email: string;
  admin: PlatformAdminRow;
  role: PlatformRole;
};

export type PlatformDashboardStats = {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  expiredTrials: number;
  mrrCents: number;
  arrCents: number;
  activeUsers: number;
  totalUsers: number;
  apiUsage: number;
  aiUsage: number;
  storageUsageMb: number;
  webhookActivity: number;
  systemHealth: "healthy" | "degraded" | "down";
  platformStatus: string;
};

export type OrgListItem = {
  id: string;
  name: string;
  slug: string;
  lifecycle_status: string;
  country: string | null;
  created_at: string;
  last_activity_at: string | null;
  support_email: string | null;
  default_email_language: string;
  memberCount: number;
  subscriptionStatus: string | null;
  planName: string | null;
};

export type SystemHealthSnapshot = {
  api: "healthy" | "degraded" | "unknown";
  database: "healthy" | "degraded" | "unknown";
  queue: "healthy" | "degraded" | "unknown";
  aiProvider: "healthy" | "degraded" | "unknown";
  emailProvider: "healthy" | "degraded" | "unknown";
  storage: "healthy" | "degraded" | "unknown";
  webhooks: "healthy" | "degraded" | "unknown";
  authentication: "healthy" | "degraded" | "unknown";
};

export type GlobalSearchResult = {
  organizations: Array<{ id: string; name: string; slug: string }>;
  users: Array<{ userId: string; email: string | null; fullName: string | null }>;
  subscriptions: Array<{ orgId: string; status: string; planId: string }>;
  invoices: Array<{ id: string; number: string | null; orgId: string }>;
  auditLogs: Array<{ id: string; action: string; created_at: string }>;
  announcements: Array<{ id: string; title: string }>;
  featureFlags: Array<{ id: string; flag_key: string; name: string }>;
};

export type JsonValue = Json;
