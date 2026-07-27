/**
 * Collaboration queries — always org-scoped.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  AttachmentRow,
  CommentRow,
  KnowledgeArticleRow,
  KnowledgeCategoryRow,
  MeetingRow,
  NotificationRow,
  SharedNoteRow,
  TeamMemberRow,
  TeamRow,
  UnifiedActivityItem,
} from "@/lib/collaboration/types";
import type { CollabEntityType } from "@/lib/collaboration/constants";

export async function listCommentsForEntity(
  organizationId: string,
  entityType: CollabEntityType,
  entityId: string,
): Promise<CommentRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_comments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listNotifications(
  organizationId: string,
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number },
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  try {
    let q = supabase
      .from("collaboration_notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("recipient_user_id", userId)
      .is("dismissed_at", null)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 50);
    if (opts?.unreadOnly) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function countUnreadNotifications(
  organizationId: string,
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  try {
    const { count, error } = await supabase
      .from("collaboration_notifications")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("recipient_user_id", userId)
      .eq("is_read", false)
      .is("dismissed_at", null);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listTeams(
  organizationId: string,
): Promise<(TeamRow & { members?: TeamMemberRow[] })[]> {
  const supabase = await createClient();
  try {
    const { data: teams, error } = await supabase
      .from("collaboration_teams")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("name");
    if (error) throw error;
    const { data: members } = await supabase
      .from("collaboration_team_members")
      .select("*")
      .eq("organization_id", organizationId);
    return (teams ?? []).map((team) => ({
      ...team,
      members: (members ?? []).filter((m) => m.team_id === team.id),
    }));
  } catch {
    return [];
  }
}

export async function listKnowledgeArticles(
  organizationId: string,
): Promise<KnowledgeArticleRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_knowledge_articles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listKnowledgeCategories(
  organizationId: string,
): Promise<KnowledgeCategoryRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_knowledge_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listSharedNotes(
  organizationId: string,
): Promise<SharedNoteRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_shared_notes")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listMeetings(
  organizationId: string,
): Promise<MeetingRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_meetings")
      .select("*")
      .eq("organization_id", organizationId)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listAttachmentsForEntity(
  organizationId: string,
  entityType: CollabEntityType,
  entityId: string,
): Promise<AttachmentRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("collaboration_attachments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUnifiedActivityFeed(
  organizationId: string,
  limit = 80,
): Promise<UnifiedActivityItem[]> {
  const supabase = await createClient();
  const items: UnifiedActivityItem[] = [];

  try {
    const { data } = await supabase
      .from("activity_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const row of data ?? []) {
      items.push({
        id: `ae-${row.id}`,
        source: "activity_events",
        eventType: row.event_type,
        description: row.description,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        metadata: (row.metadata_json as Record<string, unknown>) ?? {},
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data } = await supabase
      .from("collaboration_audit_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const row of data ?? []) {
      items.push({
        id: `ca-${row.id}`,
        source: "collaboration_audit",
        eventType: row.action,
        description: row.description,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        metadata: (row.metadata_json as Record<string, unknown>) ?? {},
      });
    }
  } catch {
    /* ignore */
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return items.slice(0, limit);
}

export async function searchCollaboration(
  organizationId: string,
  query: string,
): Promise<{
  comments: CommentRow[];
  notes: SharedNoteRow[];
  articles: KnowledgeArticleRow[];
  teams: TeamRow[];
  meetings: MeetingRow[];
}> {
  const q = query.trim();
  const empty = {
    comments: [] as CommentRow[],
    notes: [] as SharedNoteRow[],
    articles: [] as KnowledgeArticleRow[],
    teams: [] as TeamRow[],
    meetings: [] as MeetingRow[],
  };
  if (!q) return empty;

  const supabase = await createClient();
  const like = `%${q}%`;

  try {
    const [comments, notes, articles, teams, meetings] = await Promise.all([
      supabase
        .from("collaboration_comments")
        .select("*")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .ilike("body_text", like)
        .limit(20),
      supabase
        .from("collaboration_shared_notes")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("title", like)
        .limit(20),
      supabase
        .from("collaboration_knowledge_articles")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("title", like)
        .limit(20),
      supabase
        .from("collaboration_teams")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("name", like)
        .limit(20),
      supabase
        .from("collaboration_meetings")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("title", like)
        .limit(20),
    ]);

    return {
      comments: comments.data ?? [],
      notes: notes.data ?? [],
      articles: articles.data ?? [],
      teams: teams.data ?? [],
      meetings: meetings.data ?? [],
    };
  } catch {
    return empty;
  }
}
