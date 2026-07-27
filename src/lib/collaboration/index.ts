/**
 * Phase 26D — Team Collaboration public surface (client-safe).
 */

export {
  COLLAB_ENTITY_TYPES,
  COLLAB_ENTITY_LABELS,
  MENTION_TYPES,
  MENTION_TYPE_LABELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_EVENT_LABELS,
  ACTIVITY_FEED_EVENT_LABELS,
  TEAM_TYPES,
  TEAM_TYPE_LABELS,
  TEAM_MEMBER_ROLE_LABELS,
  COLLAB_PERMISSIONS,
  COLLAB_PERMISSION_LABELS,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_STATUS_LABELS,
  MEETING_STATUSES,
  MEETING_STATUS_LABELS,
  COLLAB_UI,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/collaboration/constants";

export {
  hasCollabPermission,
  canMentionEveryone,
  isOrgAdmin,
} from "@/lib/collaboration/permissions";

export {
  extractMentions,
  buildMentionSuggestions,
} from "@/lib/collaboration/mentions";

export { validateAttachmentMeta } from "@/lib/collaboration/attachments";

export {
  summarizeDiscussion,
  suggestNextActions,
  identifyUnansweredQuestions,
  generateFollowUpTasks,
  generateMeetingRecap,
} from "@/lib/collaboration/ai";
