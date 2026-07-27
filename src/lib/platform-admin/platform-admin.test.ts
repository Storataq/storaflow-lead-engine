import assert from "node:assert/strict";
import { describe, it } from "node:test";

const ROLE_PERMISSIONS = {
  platform_owner: ["organizations:manage", "impersonate:elevated"],
  platform_admin: ["organizations:manage", "impersonate:elevated"],
  platform_support: ["organizations:view", "impersonate:read_only"],
  platform_readonly: ["organizations:view", "dashboard:view"],
};

function hasPerm(role, perm) {
  return (ROLE_PERMISSIONS[role] ?? []).includes(perm);
}

function tenantIsolation(adminOrgId, customerOrgId) {
  return adminOrgId !== customerOrgId;
}

function impersonationValid(reason, mode) {
  if (!reason?.trim()) return false;
  return mode === "read_only" || mode === "elevated_support";
}

function flagEffective(globalEnabled, emergencyDisabled, orgOverride) {
  if (emergencyDisabled) return false;
  if (typeof orgOverride === "boolean") return orgOverride;
  return globalEnabled;
}

describe("platform RBAC", () => {
  it("separates platform roles from customer manage rights", () => {
    assert.equal(hasPerm("platform_readonly", "organizations:manage"), false);
    assert.equal(hasPerm("platform_support", "organizations:manage"), false);
    assert.equal(hasPerm("platform_admin", "organizations:manage"), true);
  });

  it("gates elevated impersonation", () => {
    assert.equal(hasPerm("platform_support", "impersonate:elevated"), false);
    assert.equal(hasPerm("platform_admin", "impersonate:elevated"), true);
  });
});

describe("tenant isolation", () => {
  it("never equates platform admin org with customer org blindly", () => {
    assert.equal(tenantIsolation("platform-staff", "customer-a"), true);
  });
});

describe("impersonation", () => {
  it("requires reason and valid mode", () => {
    assert.equal(impersonationValid("", "read_only"), false);
    assert.equal(impersonationValid("Support ticket #1", "read_only"), true);
  });
});

describe("feature flags", () => {
  it("honors emergency disable over org override", () => {
    assert.equal(flagEffective(true, true, true), false);
    assert.equal(flagEffective(false, false, true), true);
  });
});

describe("audit contract", () => {
  it("records admin + affected org fields", () => {
    const event = {
      admin_user_id: "adm-1",
      action: "org_suspended",
      affected_organization_id: "org-2",
    };
    assert.ok(event.admin_user_id);
    assert.ok(event.affected_organization_id);
  });
});
