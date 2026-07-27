# Team Collaboration Platform (Phase 26D)

Org-scoped collaboration for comments, mentions, notifications, teams, knowledge, notes, meetings, task extensions, and a unified activity feed. Extends CRM / Tasks / Campaigns / Copilot surfaces without replacing them.

## Architecture

| Area | Module / table |
| --- | --- |
| Comments + threads | `collaboration_comments` |
| Mentions | `collaboration_mentions` + parsers in `mentions.ts` |
| Notifications | `collaboration_notifications` (in-app; channel_flags for email/push/Slack/Teams) |
| Attachments | `collaboration_attachments` (virus-scan status ready) |
| Team spaces | `collaboration_teams` + `collaboration_team_members` |
| Knowledge base | `collaboration_knowledge_*` |
| Shared notes | `collaboration_shared_notes` |
| Meetings | `collaboration_meetings` |
| Task collab | watchers / checklists / subtasks / dependencies |
| Audit | `collaboration_audit_events` (+ mirrors into `activity_events`) |

Domain code: `src/lib/collaboration/`  
UI: `/collaboration/*`, reusable `CommentsPanel`, activity at `/activity`

## Notification system

- Per-recipient inbox (RLS: `recipient_user_id = auth.uid()`)
- Priority, read/unread, archive, dismiss, mark-all-read
- `channel_flags` JSON prepares email / push / Slack / Teams without sending yet
- Mention + reply events create notifications

## Comments

Polymorphic `entity_type` + `entity_id` for companies, contacts, deals, tasks, campaigns, automations, reports, analytics, attachments, notes, knowledge, meetings, teams.

Supports pin, soft-delete, edit timestamp, thread replies (`parent_id`), resolve thread, rich HTML + text.

`@everyone` requires owner/admin (`canMentionEveryone`).

## Activity feed

`getUnifiedActivityFeed` merges `activity_events` and `collaboration_audit_events`, paginated, newest first. `/activity` renders the unified feed.

## Knowledge base

Articles + categories, search (client filter + query helpers), favorites, version integer, permissions JSON.

## Permissions

Respects org RBAC (`owner` / `admin`). Helpers in `permissions.ts`: view, comment, mention, upload, delete, moderate, manage_teams.

## AI collaboration

Heuristic helpers in `ai.ts`: summarize discussion, next actions, unanswered questions, follow-up tasks, meeting recap. Wired into CommentsPanel and MeetingsManager; Copilot can call later.

## Extension points

1. Real-time chat / presence / live cursors
2. Video meetings & screen sharing
3. Voice notes
4. Live collaborative editing (CRDT)
5. Virus scanning worker + storage CDN for attachments
6. Outbound email/push/Slack/Teams notification delivery
7. Full-text search (pg_trgm / OpenSearch)
8. Embed `CommentsPanel` on all entity pages (campaigns, companies, …)

## Migration

`supabase/migrations/20260726000037_team_collaboration_platform.sql` — run manually after `00036`.

## Tests

```bash
node --experimental-strip-types --test src/lib/collaboration/collaboration.test.ts
```
