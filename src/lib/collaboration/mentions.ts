/**
 * Mention parsing + suggestion helpers.
 */

import type { MentionType } from "@/lib/collaboration/constants";

export type ParsedMention = {
  type: MentionType;
  raw: string;
  userId?: string;
  teamId?: string;
  label: string;
};

const MENTION_RE =
  /@(everyone|team:([a-z0-9_-]+)|user:([0-9a-f-]{36})|([A-Za-z][\w.-]{1,40}))/gi;

export function extractMentions(text: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const raw = match[0];
    if (seen.has(raw.toLowerCase())) continue;
    seen.add(raw.toLowerCase());
    const everyone = match[1]?.toLowerCase() === "everyone";
    const teamCode = match[2];
    const userId = match[3];
    const handle = match[4];
    if (everyone) {
      out.push({ type: "everyone", raw, label: "everyone" });
    } else if (teamCode) {
      out.push({ type: "team", raw, teamId: teamCode, label: teamCode });
    } else if (userId) {
      out.push({ type: "user", raw, userId, label: userId });
    } else if (handle) {
      out.push({ type: "user", raw, label: handle });
    }
  }
  return out;
}

export type MentionSuggestion = {
  type: MentionType;
  id: string;
  label: string;
  insertText: string;
};

export function buildMentionSuggestions(input: {
  query: string;
  users: Array<{ id: string; label: string }>;
  teams: Array<{ id: string; code: string; name: string }>;
  allowEveryone: boolean;
}): MentionSuggestion[] {
  const q = input.query.trim().toLowerCase();
  const suggestions: MentionSuggestion[] = [];

  if (input.allowEveryone && (!q || "everyone".startsWith(q))) {
    suggestions.push({
      type: "everyone",
      id: "everyone",
      label: "Everyone",
      insertText: "@everyone",
    });
  }

  for (const team of input.teams) {
    const hay = `${team.code} ${team.name}`.toLowerCase();
    if (!q || hay.includes(q)) {
      suggestions.push({
        type: "team",
        id: team.id,
        label: team.name,
        insertText: `@team:${team.code}`,
      });
    }
  }

  for (const user of input.users) {
    if (!q || user.label.toLowerCase().includes(q)) {
      suggestions.push({
        type: "user",
        id: user.id,
        label: user.label,
        insertText: `@user:${user.id}`,
      });
    }
  }

  return suggestions.slice(0, 12);
}
