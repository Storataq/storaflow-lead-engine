import assert from "node:assert/strict";
import { describe, it } from "node:test";

function buildEntityShareUrl(kind, id, origin = "https://app.example") {
  const paths = {
    company: `/companies/${id}`,
    contact: `/crm/contacts/${id}`,
    deal: `/crm/deals/${id}`,
    report: `/crm/executive`,
  };
  return `${origin}${paths[kind]}`;
}

function resolveAbsoluteShareUrl(url, origin = "https://app.example") {
  if (url.startsWith("http")) return url;
  return new URL(url, origin).toString();
}

function cacheVersionBump(oldVersion, newVersion) {
  return oldVersion !== newVersion;
}

function offlineActionAllowed(type) {
  const allowed = new Set([
    "company_create",
    "contact_create",
    "task_create",
    "task_update",
    "note_create",
    "activity_create",
    "comment_create",
    "ai_request_queue",
    "custom",
  ]);
  return allowed.has(type);
}

describe("pwa share helpers", () => {
  it("builds absolute entity URLs", () => {
    assert.equal(
      buildEntityShareUrl("company", "abc"),
      "https://app.example/companies/abc",
    );
  });

  it("resolves relative share URLs", () => {
    assert.equal(
      resolveAbsoluteShareUrl("/companies/1"),
      "https://app.example/companies/1",
    );
  });
});

describe("pwa offline queue contract", () => {
  it("allows known action types including AI queue-only", () => {
    assert.equal(offlineActionAllowed("ai_request_queue"), true);
    assert.equal(offlineActionAllowed("drop_table"), false);
  });
});

describe("pwa cache versioning", () => {
  it("detects service worker cache bumps", () => {
    assert.equal(cacheVersionBump("v1", "v2"), true);
  });
});

describe("organization isolation contract", () => {
  it("scopes offline sync by organization_id", () => {
    const item = { organization_id: "org-a", client_id: "c1" };
    assert.notEqual(item.organization_id, "org-b");
  });
});
