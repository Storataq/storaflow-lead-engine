"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { validateAttachmentMeta, isHttpOrDataUrl } from "@/lib/collaboration/attachments";
import { logCollabAudit } from "@/lib/collaboration/audit";
import {
  COLLAB_ENTITY_TYPES,
  TEAM_TYPES,
  KNOWLEDGE_STATUSES,
  MEETING_STATUSES,
  NOTIFICATION_PRIORITIES,
} from "@/lib/collaboration/constants";
import { extractMentions } from "@/lib/collaboration/mentions";
import {
  canMentionEveryone,
  hasCollabPermission,
  isOrgAdmin,
} from "@/lib/collaboration/permissions";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type CollabActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function revalidateCollab(paths: string[] = []) {
  revalidatePath("/collaboration");
  revalidatePath("/collaboration/notifications");
  revalidatePath("/collaboration/teams");
  revalidatePath("/collaboration/knowledge");
  revalidatePath("/collaboration/notes");
  revalidatePath("/collaboration/meetings");
  revalidatePath("/activity");
  revalidatePath("/crm/tasks");
  for (const p of paths) revalidatePath(p);
}

async function notify(
  organizationId: string,
  actorUserId: string | null,
  rows: Array<{
    recipientUserId: string;
    eventType: string;
    title: string;
    body?: string;
    priority?: string;
    entityType?: string | null;
    entityId?: string | null;
  }>,
) {
  if (rows.length === 0) return;
  const supabase = await createClient();
  await supabase.from("collaboration_notifications").insert(
    rows.map((r) => ({
      organization_id: organizationId,
      recipient_user_id: r.recipientUserId,
      actor_user_id: actorUserId,
      event_type: r.eventType,
      title: r.title,
      body: r.body ?? "",
      priority: r.priority ?? "normal",
      entity_type: r.entityType ?? null,
      entity_id: r.entityId ?? null,
      channel_flags: {
        in_app: true,
        email: false,
        push: false,
        slack: false,
        teams: false,
      } as Json,
    })),
  );
}

export async function createCommentAction(input: {
  entityType: string;
  entityId: string;
  bodyHtml: string;
  bodyText: string;
  parentId?: string | null;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!hasCollabPermission(context.membership.role, "comment")) {
      return { success: false, message: "You cannot comment." };
    }

    const parsed = z
      .object({
        entityType: z.enum(COLLAB_ENTITY_TYPES),
        entityId: z.string().uuid(),
        bodyHtml: z.string().max(50_000),
        bodyText: z.string().min(1).max(50_000),
        parentId: z.string().uuid().nullable().optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid comment." };
    }

    const mentions = extractMentions(parsed.data.bodyText);
    if (
      mentions.some((m) => m.type === "everyone") &&
      !canMentionEveryone(context.membership.role)
    ) {
      return {
        success: false,
        message: "@Everyone requires admin permission.",
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_comments")
      .insert({
        organization_id: context.organization.id,
        entity_type: parsed.data.entityType,
        entity_id: parsed.data.entityId,
        parent_id: parsed.data.parentId ?? null,
        body_html: parsed.data.bodyHtml || `<p>${parsed.data.bodyText}</p>`,
        body_text: parsed.data.bodyText,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    const mentionRows = [];
    for (const m of mentions) {
      mentionRows.push({
        organization_id: context.organization.id,
        comment_id: data.id,
        mention_type: m.type,
        mentioned_user_id: m.userId ?? null,
        mentioned_team_id: null as string | null,
        created_by: context.membership.user_id,
      });
    }
    if (mentionRows.length) {
      await supabase.from("collaboration_mentions").insert(mentionRows);
    }

    const notifyRows = mentions
      .filter((m) => m.type === "user" && m.userId)
      .map((m) => ({
        recipientUserId: m.userId!,
        eventType: "mention",
        title: "You were mentioned",
        body: parsed.data.bodyText.slice(0, 200),
        priority: "high",
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
      }));

    if (parsed.data.parentId) {
      const { data: parent } = await supabase
        .from("collaboration_comments")
        .select("created_by")
        .eq("id", parsed.data.parentId)
        .maybeSingle();
      if (
        parent?.created_by &&
        parent.created_by !== context.membership.user_id
      ) {
        notifyRows.push({
          recipientUserId: parent.created_by,
          eventType: "reply",
          title: "New reply on your comment",
          body: parsed.data.bodyText.slice(0, 200),
          priority: "normal",
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
        });
      }
    }

    await notify(
      context.organization.id,
      context.membership.user_id,
      notifyRows,
    );

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: parsed.data.parentId ? "comment_reply" : "comment",
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      description: `Comment on ${parsed.data.entityType}`,
      metadata: { commentId: data.id, mentionCount: mentions.length },
    });

    revalidateCollab();
    return { success: true, message: "Comment posted.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not post comment."),
    };
  }
}

export async function updateCommentAction(input: {
  commentId: string;
  bodyHtml: string;
  bodyText: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("collaboration_comments")
      .select("*")
      .eq("id", input.commentId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!existing) return { success: false, message: "Comment not found." };

    const canEdit =
      existing.created_by === context.membership.user_id ||
      hasCollabPermission(context.membership.role, "moderate");
    if (!canEdit) return { success: false, message: "Cannot edit this comment." };

    const { error } = await supabase
      .from("collaboration_comments")
      .update({
        body_html: input.bodyHtml,
        body_text: input.bodyText,
        edited_at: new Date().toISOString(),
      })
      .eq("id", input.commentId)
      .eq("organization_id", context.organization.id);
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "comment_edited",
      entityType: existing.entity_type,
      entityId: existing.entity_id,
      description: "Comment edited",
      metadata: { commentId: input.commentId },
    });

    revalidateCollab();
    return { success: true, message: "Comment updated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update comment."),
    };
  }
}

export async function softDeleteCommentAction(
  commentId: string,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("collaboration_comments")
      .select("*")
      .eq("id", commentId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!existing) return { success: false, message: "Comment not found." };

    const canDelete =
      existing.created_by === context.membership.user_id ||
      hasCollabPermission(context.membership.role, "delete") ||
      hasCollabPermission(context.membership.role, "moderate");
    if (!canDelete) {
      return { success: false, message: "Cannot delete this comment." };
    }

    const { error } = await supabase
      .from("collaboration_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("organization_id", context.organization.id);
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "comment_deleted",
      entityType: existing.entity_type,
      entityId: existing.entity_id,
      description: "Comment deleted",
      metadata: { commentId },
    });

    revalidateCollab();
    return { success: true, message: "Comment deleted." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not delete comment."),
    };
  }
}

export async function togglePinCommentAction(
  commentId: string,
  pinned: boolean,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!hasCollabPermission(context.membership.role, "moderate") && !isOrgAdmin(context.membership.role)) {
      // Allow authors to pin their own in thread; admins always
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_comments")
      .update({ is_pinned: pinned })
      .eq("id", commentId)
      .eq("organization_id", context.organization.id);
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: pinned ? "Pinned." : "Unpinned." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update pin."),
    };
  }
}

export async function resolveThreadAction(
  commentId: string,
  resolved: boolean,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_comments")
      .update({
        is_resolved: resolved,
        resolved_by: resolved ? context.membership.user_id : null,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq("id", commentId)
      .eq("organization_id", context.organization.id);
    if (error) throw error;
    revalidateCollab();
    return {
      success: true,
      message: resolved ? "Thread resolved." : "Thread reopened.",
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not resolve thread."),
    };
  }
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("organization_id", context.organization.id)
      .eq("recipient_user_id", context.membership.user_id);
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: "Marked read." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update notification."),
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("organization_id", context.organization.id)
      .eq("recipient_user_id", context.membership.user_id)
      .eq("is_read", false);
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: "All notifications marked read." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not mark all read."),
    };
  }
}

export async function archiveNotificationAction(
  notificationId: string,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_notifications")
      .update({ is_archived: true })
      .eq("id", notificationId)
      .eq("organization_id", context.organization.id)
      .eq("recipient_user_id", context.membership.user_id);
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: "Archived." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not archive."),
    };
  }
}

export async function dismissNotificationAction(
  notificationId: string,
): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("collaboration_notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("organization_id", context.organization.id)
      .eq("recipient_user_id", context.membership.user_id);
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: "Dismissed." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not dismiss."),
    };
  }
}

export async function createTeamAction(input: {
  code: string;
  name: string;
  description?: string;
  teamType?: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!hasCollabPermission(context.membership.role, "manage_teams")) {
      return { success: false, message: "Only admins can manage teams." };
    }

    const parsed = z
      .object({
        code: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[a-z0-9_-]+$/i),
        name: z.string().trim().min(2).max(120),
        description: z.string().max(500).optional(),
        teamType: z.enum(TEAM_TYPES).optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid team." };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_teams")
      .insert({
        organization_id: context.organization.id,
        code: parsed.data.code.toLowerCase(),
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        team_type: parsed.data.teamType ?? "custom",
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("collaboration_team_members").insert({
      organization_id: context.organization.id,
      team_id: data.id,
      user_id: context.membership.user_id,
      role: "manager",
    });

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "team_created",
      entityType: "team",
      entityId: data.id,
      description: `Team ${parsed.data.name} created`,
    });

    revalidateCollab();
    return { success: true, message: "Team created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create team."),
    };
  }
}

export async function addTeamMemberAction(input: {
  teamId: string;
  userId: string;
  role?: "member" | "manager";
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!hasCollabPermission(context.membership.role, "manage_teams")) {
      return { success: false, message: "Only admins can manage teams." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("collaboration_team_members").upsert(
      {
        organization_id: context.organization.id,
        team_id: input.teamId,
        user_id: input.userId,
        role: input.role ?? "member",
      },
      { onConflict: "team_id,user_id" },
    );
    if (error) throw error;

    await notify(context.organization.id, context.membership.user_id, [
      {
        recipientUserId: input.userId,
        eventType: "team_invite",
        title: "Added to a team space",
        body: "You were added to a collaboration team.",
        entityType: "team",
        entityId: input.teamId,
      },
    ]);

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "team_member_added",
      entityType: "team",
      entityId: input.teamId,
      description: "Team member added",
      metadata: { userId: input.userId },
    });

    revalidateCollab();
    return { success: true, message: "Member added." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add member."),
    };
  }
}

export async function createKnowledgeArticleAction(input: {
  title: string;
  slug: string;
  bodyHtml: string;
  bodyText: string;
  categoryId?: string | null;
  status?: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const parsed = z
      .object({
        title: z.string().trim().min(2).max(200),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/i),
        bodyHtml: z.string().max(200_000),
        bodyText: z.string().max(200_000),
        categoryId: z.string().uuid().nullable().optional(),
        status: z.enum(KNOWLEDGE_STATUSES).optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid article." };

    const status = parsed.data.status ?? "draft";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_knowledge_articles")
      .insert({
        organization_id: context.organization.id,
        category_id: parsed.data.categoryId ?? null,
        title: parsed.data.title,
        slug: parsed.data.slug.toLowerCase(),
        body_html: parsed.data.bodyHtml,
        body_text: parsed.data.bodyText,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "knowledge_created",
      entityType: "knowledge_article",
      entityId: data.id,
      description: `Knowledge article: ${parsed.data.title}`,
    });

    revalidateCollab();
    return { success: true, message: "Article saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save article."),
    };
  }
}

export async function createKnowledgeCategoryAction(input: {
  name: string;
  slug: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isOrgAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can manage categories." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_knowledge_categories")
      .insert({
        organization_id: context.organization.id,
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidateCollab();
    return { success: true, message: "Category created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create category."),
    };
  }
}

export async function createSharedNoteAction(input: {
  title: string;
  bodyHtml: string;
  bodyText: string;
  teamId?: string | null;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_shared_notes")
      .insert({
        organization_id: context.organization.id,
        team_id: input.teamId ?? null,
        title: input.title.trim(),
        body_html: input.bodyHtml,
        body_text: input.bodyText,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "note_created",
      entityType: "note",
      entityId: data.id,
      description: `Shared note: ${input.title}`,
    });

    revalidateCollab();
    return { success: true, message: "Note created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create note."),
    };
  }
}

export async function createMeetingAction(input: {
  title: string;
  agendaHtml?: string;
  notesHtml?: string;
  scheduledAt?: string | null;
  status?: string;
  participantsJson?: unknown;
  actionItemsJson?: unknown;
  linkedCompanyIds?: string[];
  linkedDealIds?: string[];
  linkedContactIds?: string[];
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const status = z.enum(MEETING_STATUSES).catch("scheduled").parse(input.status);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_meetings")
      .insert({
        organization_id: context.organization.id,
        title: input.title.trim(),
        agenda_html: input.agendaHtml ?? "",
        notes_html: input.notesHtml ?? "",
        scheduled_at: input.scheduledAt ?? null,
        status,
        participants_json: (input.participantsJson ?? []) as Json,
        action_items_json: (input.actionItemsJson ?? []) as Json,
        linked_company_ids: (input.linkedCompanyIds ?? []) as Json,
        linked_deal_ids: (input.linkedDealIds ?? []) as Json,
        linked_contact_ids: (input.linkedContactIds ?? []) as Json,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "meeting_created",
      entityType: "meeting",
      entityId: data.id,
      description: `Meeting: ${input.title}`,
    });

    revalidateCollab();
    return { success: true, message: "Meeting saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save meeting."),
    };
  }
}

export async function uploadAttachmentAction(input: {
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  storageUrl?: string | null;
  dataUrl?: string | null;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!hasCollabPermission(context.membership.role, "upload")) {
      return { success: false, message: "Upload not allowed." };
    }

    const entityType = z.enum(COLLAB_ENTITY_TYPES).parse(input.entityType);
    const validation = validateAttachmentMeta({
      contentType: input.contentType,
      byteSize: input.byteSize,
      fileName: input.fileName,
    });
    if (!validation.ok) return { success: false, message: validation.message };

    const url = input.storageUrl || input.dataUrl || "";
    if (url && !isHttpOrDataUrl(url)) {
      return { success: false, message: "Invalid attachment URL." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_attachments")
      .insert({
        organization_id: context.organization.id,
        entity_type: entityType,
        entity_id: input.entityId,
        file_name: input.fileName,
        content_type: validation.contentType,
        byte_size: validation.byteSize,
        storage_url: input.storageUrl ?? null,
        data_url: input.dataUrl ?? null,
        virus_scan_status: validation.virusScanStatus,
        uploaded_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logCollabAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "file_upload",
      entityType,
      entityId: input.entityId,
      description: `Uploaded ${input.fileName}`,
      metadata: { attachmentId: data.id },
    });

    revalidateCollab();
    return { success: true, message: "Attachment uploaded.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not upload attachment."),
    };
  }
}

export async function addTaskWatcherAction(input: {
  taskId: string;
  userId: string;
  role?: "watcher" | "follower";
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { error } = await supabase.from("collaboration_task_watchers").upsert(
      {
        organization_id: context.organization.id,
        task_id: input.taskId,
        user_id: input.userId,
        role: input.role ?? "watcher",
      },
      { onConflict: "task_id,user_id" },
    );
    if (error) throw error;

    await notify(context.organization.id, context.membership.user_id, [
      {
        recipientUserId: input.userId,
        eventType: "assignment",
        title: "Watching a task",
        body: "You were added as a watcher/follower.",
        entityType: "task",
        entityId: input.taskId,
        priority: "normal",
      },
    ]);

    revalidateCollab(["/crm/tasks"]);
    return { success: true, message: "Watcher added." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add watcher."),
    };
  }
}

export async function addChecklistItemAction(input: {
  taskId: string;
  title: string;
  checklistTitle?: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();

    let checklistId: string | null = null;
    const { data: existing } = await supabase
      .from("collaboration_task_checklists")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("task_id", input.taskId)
      .limit(1)
      .maybeSingle();
    checklistId = existing?.id ?? null;

    if (!checklistId) {
      const { data: created, error } = await supabase
        .from("collaboration_task_checklists")
        .insert({
          organization_id: context.organization.id,
          task_id: input.taskId,
          title: input.checklistTitle ?? "Checklist",
        })
        .select("id")
        .single();
      if (error) throw error;
      checklistId = created.id;
    }

    const { data, error } = await supabase
      .from("collaboration_task_checklist_items")
      .insert({
        organization_id: context.organization.id,
        checklist_id: checklistId,
        title: input.title.trim(),
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidateCollab(["/crm/tasks"]);
    return { success: true, message: "Checklist item added.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add checklist item."),
    };
  }
}

export async function addSubtaskAction(input: {
  parentTaskId: string;
  title: string;
  dueAt?: string | null;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaboration_task_subtasks")
      .insert({
        organization_id: context.organization.id,
        parent_task_id: input.parentTaskId,
        title: input.title.trim(),
        due_at: input.dueAt ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidateCollab(["/crm/tasks"]);
    return { success: true, message: "Subtask added.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add subtask."),
    };
  }
}

export async function addTaskDependencyAction(input: {
  taskId: string;
  dependsOnTaskId: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (input.taskId === input.dependsOnTaskId) {
      return { success: false, message: "A task cannot depend on itself." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("collaboration_task_dependencies").insert({
      organization_id: context.organization.id,
      task_id: input.taskId,
      depends_on_task_id: input.dependsOnTaskId,
    });
    if (error) throw error;
    revalidateCollab(["/crm/tasks"]);
    return { success: true, message: "Dependency added." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add dependency."),
    };
  }
}

export async function toggleFavoriteAction(input: {
  entityType: string;
  entityId: string;
}): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const entityType = z.enum(COLLAB_ENTITY_TYPES).parse(input.entityType);
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("collaboration_favorites")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("user_id", context.membership.user_id)
      .eq("entity_type", entityType)
      .eq("entity_id", input.entityId)
      .maybeSingle();

    if (existing) {
      await supabase.from("collaboration_favorites").delete().eq("id", existing.id);
      revalidateCollab();
      return { success: true, message: "Removed from favorites." };
    }

    await supabase.from("collaboration_favorites").insert({
      organization_id: context.organization.id,
      user_id: context.membership.user_id,
      entity_type: entityType,
      entity_id: input.entityId,
    });
    revalidateCollab();
    return { success: true, message: "Added to favorites." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update favorite."),
    };
  }
}

/** Seed a sample in-app notification for demos / channel readiness. */
export async function createDemoNotificationAction(): Promise<CollabActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    await notify(context.organization.id, context.membership.user_id, [
      {
        recipientUserId: context.membership.user_id,
        eventType: "ai_analysis",
        title: "Collaboration ready",
        body: "In-app notifications are active. Email/push/Slack/Teams channels are prepared.",
        priority: z.enum(NOTIFICATION_PRIORITIES).parse("normal"),
      },
    ]);
    revalidateCollab();
    return { success: true, message: "Demo notification created." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create notification."),
    };
  }
}
