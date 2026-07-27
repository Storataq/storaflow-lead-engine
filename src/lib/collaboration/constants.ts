/**
 * Phase 26D — Team Collaboration constants (label catalog = i18n pattern).
 */

export const COLLAB_ENTITY_TYPES = [
  "company",
  "contact",
  "deal",
  "task",
  "campaign",
  "automation",
  "report",
  "analytics",
  "attachment",
  "comment",
  "note",
  "knowledge_article",
  "meeting",
  "team",
] as const;

export type CollabEntityType = (typeof COLLAB_ENTITY_TYPES)[number];

export const COLLAB_ENTITY_LABELS: Record<CollabEntityType, string> = {
  company: "Company",
  contact: "Contact",
  deal: "Deal",
  task: "Task",
  campaign: "Campaign",
  automation: "Automation",
  report: "Report",
  analytics: "Analytics",
  attachment: "Attachment",
  comment: "Comment",
  note: "Note",
  knowledge_article: "Knowledge article",
  meeting: "Meeting",
  team: "Team",
};

export const MENTION_TYPES = ["user", "team", "everyone"] as const;
export type MentionType = (typeof MENTION_TYPES)[number];

export const MENTION_TYPE_LABELS: Record<MentionType, string> = {
  user: "@User",
  team: "@Team",
  everyone: "@Everyone",
};

export const NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> =
  {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  };

export const NOTIFICATION_EVENT_TYPES = [
  "mention",
  "comment",
  "reply",
  "assignment",
  "task_completed",
  "deal_won",
  "deal_lost",
  "campaign_started",
  "campaign_finished",
  "automation_triggered",
  "ai_analysis",
  "file_upload",
  "team_invite",
  "knowledge_update",
  "meeting_reminder",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  mention: "Mention",
  comment: "Comment",
  reply: "Reply",
  assignment: "Assigned",
  task_completed: "Task completed",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  campaign_started: "Campaign started",
  campaign_finished: "Campaign finished",
  automation_triggered: "Automation triggered",
  ai_analysis: "AI analysis",
  file_upload: "File upload",
  team_invite: "Team invite",
  knowledge_update: "Knowledge update",
  meeting_reminder: "Meeting reminder",
};

export const ACTIVITY_FEED_EVENT_TYPES = [
  "created",
  "updated",
  "deleted",
  "assigned",
  "completed",
  "won",
  "lost",
  "campaign_started",
  "campaign_finished",
  "automation_triggered",
  "ai_analysis",
  "comment",
  "mention",
  "file_upload",
] as const;

export type ActivityFeedEventType = (typeof ACTIVITY_FEED_EVENT_TYPES)[number];

export const ACTIVITY_FEED_EVENT_LABELS: Record<ActivityFeedEventType, string> =
  {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    assigned: "Assigned",
    completed: "Completed",
    won: "Won",
    lost: "Lost",
    campaign_started: "Campaign started",
    campaign_finished: "Campaign finished",
    automation_triggered: "Automation triggered",
    ai_analysis: "AI analysis",
    comment: "Comment",
    mention: "Mention",
    file_upload: "File upload",
  };

export const TEAM_TYPES = [
  "sales",
  "marketing",
  "support",
  "management",
  "custom",
] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

export const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  sales: "Sales",
  marketing: "Marketing",
  support: "Support",
  management: "Management",
  custom: "Custom",
};

export const TEAM_MEMBER_ROLES = ["member", "manager"] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  member: "Member",
  manager: "Manager",
};

export const COLLAB_PERMISSIONS = [
  "view",
  "comment",
  "mention",
  "upload",
  "delete",
  "moderate",
  "manage_teams",
] as const;
export type CollabPermission = (typeof COLLAB_PERMISSIONS)[number];

export const COLLAB_PERMISSION_LABELS: Record<CollabPermission, string> = {
  view: "View",
  comment: "Comment",
  mention: "Mention",
  upload: "Upload",
  delete: "Delete",
  moderate: "Moderate",
  manage_teams: "Manage teams",
};

export const KNOWLEDGE_STATUSES = ["draft", "published", "archived"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const MEETING_STATUSES = [
  "draft",
  "scheduled",
  "completed",
  "cancelled",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const VIRUS_SCAN_STATUSES = [
  "pending",
  "clean",
  "infected",
  "skipped",
  "error",
] as const;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
] as const;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const COLLAB_UI = {
  hubTitle: "Collaboration",
  hubDescription:
    "Comments, notifications, teams, knowledge, notes, and meetings — org-scoped.",
  commentsTitle: "Comments",
  notificationsTitle: "Notifications",
  teamsTitle: "Team spaces",
  knowledgeTitle: "Knowledge base",
  notesTitle: "Shared notes",
  meetingsTitle: "Meetings",
  activityTitle: "Activity feed",
  searchPlaceholder: "Search comments, notes, knowledge, teams…",
  emptyComments: "No comments yet. Start the thread.",
  emptyNotifications: "You’re all caught up.",
  emptyTeams: "No team spaces yet.",
  emptyKnowledge: "No articles yet.",
  emptyNotes: "No shared notes yet.",
  emptyMeetings: "No meetings yet.",
  markAllRead: "Mark all read",
  resolveThread: "Resolve thread",
  pinComment: "Pin",
  unpinComment: "Unpin",
  mentionEveryoneDenied: "@Everyone requires admin permission.",
  futureChat: "Internal chat — coming soon",
  futureVideo: "Video meetings — coming soon",
  futurePresence: "Presence indicators — coming soon",
} as const;
