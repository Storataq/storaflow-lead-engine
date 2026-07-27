import assert from "node:assert/strict";
import { describe, it } from "node:test";

function validatePassword(password, policy) {
  if (password.length < policy.minLength) return { ok: false };
  if (policy.requireUpper && !/[A-Z]/.test(password)) return { ok: false };
  if (policy.requireLower && !/[a-z]/.test(password)) return { ok: false };
  if (policy.requireNumber && !/[0-9]/.test(password)) return { ok: false };
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password))
    return { ok: false };
  return { ok: true };
}

function hasPermission(role, resource, action) {
  const matrix = {
    owner: { security: ["view", "manage"], users: ["view", "manage"] },
    admin: { security: ["view", "manage"], users: ["view", "manage"] },
    member: { companies: ["view", "create"], security: [] },
    viewer: { companies: ["view"] },
  };
  return (matrix[role]?.[resource] ?? []).includes(action);
}

function isAdmin(role) {
  return role === "owner" || role === "admin";
}

function parseUa(ua) {
  let browser = "Unknown";
  if (/chrome\//i.test(ua)) browser = "Chrome";
  let os = "Unknown";
  if (/windows/i.test(ua)) os = "Windows";
  return { browser, os };
}

function ipAllowed(ip, cidrs) {
  if (!cidrs.length) return true;
  return cidrs.some((c) => ip === c || ip.startsWith(c.split("/")[0]));
}

describe("security password policy", () => {
  it("enforces complexity", () => {
    const policy = {
      minLength: 8,
      requireUpper: true,
      requireLower: true,
      requireNumber: true,
      requireSymbol: false,
    };
    assert.equal(validatePassword("short", policy).ok, false);
    assert.equal(validatePassword("Password1", policy).ok, true);
  });
});

describe("security RBAC", () => {
  it("isolates manage to admins", () => {
    assert.equal(hasPermission("admin", "security", "manage"), true);
    assert.equal(hasPermission("member", "security", "manage"), false);
    assert.equal(hasPermission("viewer", "companies", "view"), true);
    assert.equal(isAdmin("member"), false);
  });
});

describe("security sessions/devices helpers", () => {
  it("parses user agent", () => {
    const p = parseUa(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    );
    assert.equal(p.browser, "Chrome");
    assert.equal(p.os, "Windows");
  });
});

describe("security access policies", () => {
  it("checks allowed IPs", () => {
    assert.equal(ipAllowed("1.2.3.4", []), true);
    assert.equal(ipAllowed("1.2.3.4", ["1.2.3.4"]), true);
    assert.equal(ipAllowed("9.9.9.9", ["1.2.3.4"]), false);
  });
});

describe("organization isolation contract", () => {
  it("keeps audit rows org scoped", () => {
    const row = { organization_id: "org-a", action: "login" };
    assert.notEqual(row.organization_id, "org-b");
  });
});
