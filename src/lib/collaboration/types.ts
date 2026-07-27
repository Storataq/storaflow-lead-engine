import type { Database } from "@/types/supabase";
import type {
  CollabEntityType,
  KnowledgeStatus,
  MeetingStatus,
  NotificationPriority,
  TeamType,
} from "@/lib/collaboration/constants";

export type CommentRow =
  Database["public"]["Tables"]["collaboration_comments"]["Row"];
export type MentionRow =
  Database["public"]["Tables"]["collaboration_mentions"]["Row"];
export type NotificationRow =
  Database["public"]["Tables"]["collaboration_notifications"]["Row"];
export type AttachmentRow =
  Database["public"]["Tables"]["collaboration_attachments"]["Row"];
export type TeamRow =
  Database["public"]["Tables"]["collaboration_teams"]["Row"];
export type TeamMemberRow =
  Database["public"]["Tables"]["collaboration_team_members"]["Row"];
export type KnowledgeCategoryRow =
  Database["public"]["Tables"]["collaboration_knowledge_categories"]["Row"];
export type KnowledgeArticleRow =
  Database["public"]["Tables"]["collaboration_knowledge_articles"]["Row"];
export type SharedNoteRow =
  Database["public"]["Tables"]["collaboration_shared_notes"]["Row"];
export type MeetingRow =
  Database["public"]["Tables"]["collaboration_meetings"]["Row"];
export type TaskWatcherRow =
  Database["public"]["Tables"]["collaboration_task_watchers"]["Row"];
export type ChecklistRow =
  Database["public"]["Tables"]["collaboration_task_checklists"]["Row"];
export type ChecklistItemRow =
  Database["public"]["Tables"]["collaboration_task_checklist_items"]["Row"];
export type AuditEventRow =
  Database["public"]["Tables"]["collaboration_audit_events"]["Row"];

export type CreateCommentInput = {
  entityType: CollabEntityType;
  entityId: string;
  bodyHtml: string;
  bodyText: string;
  parentId?: string | null;
};

export type CreateNotificationInput = {
  recipientUserId: string;
  eventType: string;
  title: string;
  body?: string;
  priority?: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  channelFlags?: Record<string, boolean>;
};

export type CreateTeamInput = {
  code: string;
  name: string;
  description?: string;
  teamType?: TeamType;
};

export type CreateKnowledgeArticleInput = {
  title: string;
  slug: string;
  bodyHtml: string;
  bodyText: string;
  categoryId?: string | null;
  status?: KnowledgeStatus;
};

export type CreateSharedNoteInput = {
  title: string;
  bodyHtml: string;
  bodyText: string;
  teamId?: string | null;
};

export type CreateMeetingInput = {
  title: string;
  agendaHtml?: string;
  notesHtml?: string;
  scheduledAt?: string | null;
  status?: MeetingStatus;
  participants?: Array<{ userId?: string; name: string; email?: string }>;
  actionItems?: Array<{ title: string; owner?: string; done?: boolean }>;
  linkedCompanyIds?: string[];
  linkedDealIds?: string[];
  linkedContactIds?: string[];
};

export type UnifiedActivityItem = {
  id: string;
  source: "activity_events" | "collaboration_audit" | "notification";
  eventType: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
