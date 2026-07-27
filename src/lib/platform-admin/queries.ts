/**
 * Platform admin queries — service role after requirePlatformAdmin gate.
 */

import {
  requirePlatformAdmin,
  platformServiceClient,
} from "@/lib/platform-admin/auth";
import type {
  GlobalSearchResult,
  OrgListItem,
  PlatformAnnouncementRow,
  PlatformAuditEventRow,
  PlatformDashboardStats,
  PlatformFeatureFlagRow,
  PlatformLicenseRow,
  PlatformNotificationRow,
  PlatformSettingRow,
  PlatformUserControlRow,
  SystemHealthSnapshot,
} from "@/lib/platform-admin/types";

export async function getPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  await requirePlatformAdmin();
  const empty: PlatformDashboardStats = {
    totalOrganizations: 0,
    activeOrganizations: 0,
    trialOrganizations: 0,
    expiredTrials: 0,
    mrrCents: 0,
    arrCents: 0,
    activeUsers: 0,
    totalUsers: 0,
    apiUsage: 0,
    aiUsage: 0,
    storageUsageMb: 0,
    webhookActivity: 0,
    systemHealth: "degraded",
    platformStatus: "unknown",
  };

  try {
    const supabase = await platformServiceClient();
    const { count: totalOrgs } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .neq("lifecycle_status", "deleted");

    const { count: activeOrgs } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("lifecycle_status", "active");

    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("status, plan_id, billing_interval, trial_ends_at");
    const { data: plans } = await supabase.from("billing_plans").select("*");
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));

    let mrr = 0;
    let trial = 0;
    let expiredTrials = 0;
    const now = Date.now();
    for (const sub of subs ?? []) {
      if (sub.status === "trialing") {
        trial += 1;
        if (sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() < now) {
          expiredTrials += 1;
        }
      }
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      const plan = planMap.get(sub.plan_id);
      if (!plan) continue;
      const price = Number(plan.price_cents);
      mrr +=
        plan.billing_interval === "year" ? Math.round(price / 12) : price;
    }

    const { count: totalUsers } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true });

    let apiUsage = 0;
    try {
      const { data: apiRows } = await supabase
        .from("platform_api_usage_daily")
        .select("request_count");
      apiUsage = (apiRows ?? []).reduce(
        (s, r) => s + Number(r.request_count ?? 0),
        0,
      );
    } catch {
      apiUsage = 0;
    }

    let webhookActivity = 0;
    try {
      const { count } = await supabase
        .from("platform_webhook_deliveries")
        .select("*", { count: "exact", head: true });
      webhookActivity = count ?? 0;
    } catch {
      webhookActivity = 0;
    }

    return {
      totalOrganizations: totalOrgs ?? 0,
      activeOrganizations: activeOrgs ?? 0,
      trialOrganizations: trial,
      expiredTrials,
      mrrCents: mrr,
      arrCents: mrr * 12,
      activeUsers: totalUsers ?? 0,
      totalUsers: totalUsers ?? 0,
      apiUsage,
      aiUsage: 0,
      storageUsageMb: 0,
      webhookActivity,
      systemHealth: "healthy",
      platformStatus: "operational",
    };
  } catch {
    return empty;
  }
}

export async function listPlatformOrganizations(input?: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: OrgListItem[]; total: number }> {
  await requirePlatformAdmin();
  const limit = Math.min(input?.limit ?? 50, 200);
  const offset = input?.offset ?? 0;

  try {
    const supabase = await platformServiceClient();
    let query = supabase
      .from("organizations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (input?.status) {
      query = query.eq("lifecycle_status", input.status);
    } else {
      query = query.neq("lifecycle_status", "deleted");
    }
    if (input?.q?.trim()) {
      const q = `%${input.q.trim()}%`;
      query = query.or(`name.ilike.${q},slug.ilike.${q},support_email.ilike.${q}`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const orgIds = (data ?? []).map((o) => o.id);
    const memberCounts = new Map<string, number>();
    const subByOrg = new Map<
      string,
      { status: string; planName: string | null }
    >();

    if (orgIds.length) {
      const { data: members } = await supabase
        .from("organization_members")
        .select("organization_id")
        .in("organization_id", orgIds);
      for (const m of members ?? []) {
        memberCounts.set(
          m.organization_id,
          (memberCounts.get(m.organization_id) ?? 0) + 1,
        );
      }
      const { data: subs } = await supabase
        .from("billing_subscriptions")
        .select("organization_id, status, plan_id")
        .in("organization_id", orgIds);
      const planIds = [...new Set((subs ?? []).map((s) => s.plan_id))];
      const { data: plans } = planIds.length
        ? await supabase.from("billing_plans").select("id, name").in("id", planIds)
        : { data: [] as Array<{ id: string; name: string }> };
      const planNames = new Map((plans ?? []).map((p) => [p.id, p.name]));
      for (const s of subs ?? []) {
        subByOrg.set(s.organization_id, {
          status: s.status,
          planName: planNames.get(s.plan_id) ?? null,
        });
      }
    }

    const rows: OrgListItem[] = (data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      lifecycle_status: o.lifecycle_status ?? "active",
      country: o.country ?? null,
      created_at: o.created_at,
      last_activity_at: o.last_activity_at ?? null,
      support_email: o.support_email,
      default_email_language: o.default_email_language,
      memberCount: memberCounts.get(o.id) ?? 0,
      subscriptionStatus: subByOrg.get(o.id)?.status ?? null,
      planName: subByOrg.get(o.id)?.planName ?? null,
    }));

    return { rows, total: count ?? rows.length };
  } catch {
    return { rows: [], total: 0 };
  }
}

export async function getPlatformOrganizationDetail(orgId: string) {
  await requirePlatformAdmin();
  const supabase = await platformServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;

  const { data: members } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", orgId);
  const { data: sub } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  let plan = null;
  if (sub) {
    const { data } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("id", sub.plan_id)
      .maybeSingle();
    plan = data;
  }
  const { data: invoices } = await supabase
    .from("billing_invoices")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: licenses } = await supabase
    .from("platform_licenses")
    .select("*")
    .eq("organization_id", orgId);

  const owner = (members ?? []).find((m) => m.role === "owner");

  return {
    organization: org,
    members: members ?? [],
    ownerUserId: owner?.user_id ?? org.created_by,
    subscription: sub,
    plan,
    invoices: invoices ?? [],
    licenses: (licenses ?? []) as PlatformLicenseRow[],
    userCount: members?.length ?? 0,
  };
}

export async function listPlatformUsers(input?: {
  q?: string;
  limit?: number;
}): Promise<
  Array<{
    userId: string;
    email: string | null;
    fullName: string | null;
    role: string;
    organizationId: string;
    organizationName: string;
    status: string;
    lastLoginAt: string | null;
    country: string | null;
  }>
> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, role, organization_id, created_at")
      .order("created_at", { ascending: false })
      .limit(input?.limit ?? 100);

    const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
    const orgIds = [...new Set((members ?? []).map((m) => m.organization_id))];

    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds)
      : { data: [] };
    const { data: orgs } = orgIds.length
      ? await supabase.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] };
    const { data: controls } = userIds.length
      ? await supabase
          .from("platform_user_controls")
          .select("*")
          .in("user_id", userIds)
      : { data: [] as PlatformUserControlRow[] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.full_name]),
    );
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));
    const controlMap = new Map(
      ((controls ?? []) as PlatformUserControlRow[]).map((c) => [c.user_id, c]),
    );

    let rows = (members ?? []).map((m) => {
      const c = controlMap.get(m.user_id);
      return {
        userId: m.user_id,
        email: c?.email ?? null,
        fullName: profileMap.get(m.user_id) ?? c?.full_name ?? null,
        role: m.role,
        organizationId: m.organization_id,
        organizationName: orgMap.get(m.organization_id) ?? "—",
        status: c?.status ?? "active",
        lastLoginAt: c?.last_login_at ?? null,
        country: c?.country ?? null,
      };
    });

    if (input?.q?.trim()) {
      const q = input.q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.organizationName.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q),
      );
    }

    return rows;
  } catch {
    return [];
  }
}

export async function listPlatformSubscriptions(limit = 100) {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    const orgIds = [...new Set((subs ?? []).map((s) => s.organization_id))];
    const planIds = [...new Set((subs ?? []).map((s) => s.plan_id))];
    const { data: orgs } = orgIds.length
      ? await supabase.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] };
    const { data: plans } = planIds.length
      ? await supabase.from("billing_plans").select("*").in("id", planIds)
      : { data: [] };
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
    return (subs ?? []).map((s) => ({
      ...s,
      organizationName: orgMap.get(s.organization_id) ?? "—",
      plan: planMap.get(s.plan_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function listPlatformLicenses(): Promise<PlatformLicenseRow[]> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_licenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPlatformFeatureFlags(): Promise<
  PlatformFeatureFlagRow[]
> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_feature_flags")
      .select("*")
      .order("flag_key");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPlatformAnnouncements(): Promise<
  PlatformAnnouncementRow[]
> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPlatformAuditEvents(
  limit = 100,
): Promise<PlatformAuditEventRow[]> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPlatformNotifications(): Promise<
  PlatformNotificationRow[]
> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPlatformSettings(): Promise<PlatformSettingRow[]> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase.from("platform_settings").select("*");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { error } = await supabase
      .from("organizations")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    const db: SystemHealthSnapshot["database"] = error ? "degraded" : "healthy";
    return {
      api: "healthy",
      database: db,
      queue: "unknown",
      aiProvider: process.env.OPENAI_API_KEY ? "healthy" : "unknown",
      emailProvider: process.env.RESEND_API_KEY ? "healthy" : "unknown",
      storage: "unknown",
      webhooks: "unknown",
      authentication: "healthy",
    };
  } catch {
    return {
      api: "unknown",
      database: "degraded",
      queue: "unknown",
      aiProvider: "unknown",
      emailProvider: "unknown",
      storage: "unknown",
      webhooks: "unknown",
      authentication: "unknown",
    };
  }
}

export async function getSecurityOverview() {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    let failedLogins = 0;
    let openAlerts = 0;
    let lockedAccounts = 0;
    try {
      const { count } = await supabase
        .from("security_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("success", false);
      failedLogins = count ?? 0;
    } catch {
      failedLogins = 0;
    }
    try {
      const { count } = await supabase
        .from("security_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      openAlerts = count ?? 0;
    } catch {
      openAlerts = 0;
    }
    try {
      const { count } = await supabase
        .from("security_account_locks")
        .select("*", { count: "exact", head: true })
        .is("unlocked_at", null);
      lockedAccounts = count ?? 0;
    } catch {
      lockedAccounts = 0;
    }
    return {
      failedLogins,
      openAlerts,
      lockedAccounts,
      suspiciousActivity: openAlerts,
      expiredSessions: 0,
      disabledMfa: 0,
    };
  } catch {
    return {
      failedLogins: 0,
      openAlerts: 0,
      lockedAccounts: 0,
      suspiciousActivity: 0,
      expiredSessions: 0,
      disabledMfa: 0,
    };
  }
}

export async function globalPlatformSearch(
  q: string,
): Promise<GlobalSearchResult> {
  await requirePlatformAdmin();
  const empty: GlobalSearchResult = {
    organizations: [],
    users: [],
    subscriptions: [],
    invoices: [],
    auditLogs: [],
    announcements: [],
    featureFlags: [],
  };
  if (!q.trim()) return empty;

  try {
    const supabase = await platformServiceClient();
    const pattern = `%${q.trim()}%`;

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(20);

    const { data: controls } = await supabase
      .from("platform_user_controls")
      .select("user_id, email, full_name")
      .or(`email.ilike.${pattern},full_name.ilike.${pattern}`)
      .limit(20);

    const { data: audit } = await supabase
      .from("platform_audit_events")
      .select("id, action, created_at")
      .ilike("action", pattern)
      .limit(20);

    const { data: announcements } = await supabase
      .from("platform_announcements")
      .select("id, title")
      .ilike("title", pattern)
      .limit(20);

    const { data: flags } = await supabase
      .from("platform_feature_flags")
      .select("id, flag_key, name")
      .or(`flag_key.ilike.${pattern},name.ilike.${pattern}`)
      .limit(20);

    const { data: invoices } = await supabase
      .from("billing_invoices")
      .select("id, number, organization_id")
      .ilike("number", pattern)
      .limit(20);

    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("organization_id, status, plan_id")
      .ilike("status", pattern)
      .limit(20);

    return {
      organizations: orgs ?? [],
      users: (controls ?? []).map((c) => ({
        userId: c.user_id,
        email: c.email,
        fullName: c.full_name,
      })),
      subscriptions: (subs ?? []).map((s) => ({
        orgId: s.organization_id,
        status: s.status,
        planId: s.plan_id,
      })),
      invoices: (invoices ?? []).map((i) => ({
        id: i.id,
        number: i.number,
        orgId: i.organization_id,
      })),
      auditLogs: audit ?? [],
      announcements: announcements ?? [],
      featureFlags: flags ?? [],
    };
  } catch {
    return empty;
  }
}

export async function getActiveImpersonation(adminUserId: string) {
  await requirePlatformAdmin();
  try {
    const supabase = await platformServiceClient();
    const { data } = await supabase
      .from("platform_impersonation_sessions")
      .select("*")
      .eq("admin_user_id", adminUserId)
      .is("ended_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}
