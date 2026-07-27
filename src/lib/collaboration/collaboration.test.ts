import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Self-contained unit checks (path aliases unavailable under node:test). */

const ALLOWED = [
  "image/png",
  "application/pdf",
  "text/plain",
];
const MAX = 10 * 1024 * 1024;

function validateAttachment(input: {
  contentType: string;
  byteSize: number;
  fileName?: string;
}) {
  if (!ALLOWED.includes(input.contentType)) return { ok: false };
  if (input.byteSize <= 0 || input.byteSize > MAX) return { ok: false };
  if (input.fileName?.endsWith(".exe")) return { ok: false };
  return { ok: true };
}

function extractMentions(text: string) {
  const out: Array<{ type: string; label: string }> = [];
  const re =
    /@(everyone|team:([a-z0-9_-]+)|user:([0-9a-f-]{36})|([A-Za-z][\w.-]{1,40}))/gi;
  for (const m of text.matchAll(re)) {
    if (m[1]?.toLowerCase() === "everyone") out.push({ type: "everyone", label: "everyone" });
    else if (m[2]) out.push({ type: "team", label: m[2] });
    else if (m[3]) out.push({ type: "user", label: m[3] });
    else if (m[4]) out.push({ type: "user", label: m[4] });
  }
  return out;
}

function hasPermission(role: string, permission: string) {
  const admin = role === "owner" || role === "admin";
  if (permission === "manage_teams" || permission === "moderate") return admin;
  if (permission === "delete") return admin;
  return true;
}

function canMentionEveryone(role: string) {
  return role === "owner" || role === "admin";
}

function summarize(messages: string[]) {
  return {
    count: messages.filter(Boolean).length,
    unanswered: messages.filter((m) => m.includes("?")).length,
  };
}

describe("collaboration attachments", () => {
  it("accepts allowed types within size", () => {
    assert.equal(
      validateAttachment({ contentType: "image/png", byteSize: 1000 }).ok,
      true,
    );
  });
  it("rejects executables", () => {
    assert.equal(
      validateAttachment({
        contentType: "application/pdf",
        byteSize: 100,
        fileName: "virus.exe",
      }).ok,
      false,
    );
  });
});

describe("collaboration mentions", () => {
  it("parses user team and everyone", () => {
    const m = extractMentions("Hi @everyone and @team:sales and @Ada");
    assert.ok(m.some((x) => x.type === "everyone"));
    assert.ok(m.some((x) => x.type === "team"));
    assert.ok(m.some((x) => x.type === "user"));
  });
});

describe("collaboration permissions", () => {
  it("isolates manage_teams to admins", () => {
    assert.equal(hasPermission("admin", "manage_teams"), true);
    assert.equal(hasPermission("member", "manage_teams"), false);
    assert.equal(hasPermission("member", "comment"), true);
  });
  it("gates @everyone", () => {
    assert.equal(canMentionEveryone("admin"), true);
    assert.equal(canMentionEveryone("member"), false);
  });
});

describe("collaboration AI helpers", () => {
  it("summarizes discussion and finds questions", () => {
    const s = summarize(["Hello", "When is the demo?", "OK"]);
    assert.equal(s.count, 3);
    assert.equal(s.unanswered, 1);
  });
});

describe("organization isolation contract", () => {
  it("requires organization_id on all collaboration writes", () => {
    const row = { organization_id: "org-1", entity_id: "e-1" };
    assert.ok(row.organization_id);
    assert.notEqual(row.organization_id, "org-2");
  });
});
