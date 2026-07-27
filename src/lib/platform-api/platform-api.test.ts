import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { describe, it, beforeEach } from "node:test";

import {
  checkMinuteRateLimit,
  __resetMinuteBucketsForTests,
} from "./rate-limit.ts";
import { parseListQuery, paginationMeta } from "./list-query.ts";

const API_KEY_PREFIX = "sf_live_";

function hashApiKey(plaintext: string) {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

function generateApiKeyMaterial() {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12),
    hash: hashApiKey(plaintext),
  };
}

function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1].trim();
  }
  return request.headers.get("x-api-key")?.trim() || null;
}

function hasScope(granted: string[], required: string) {
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  if (required.endsWith(":read")) {
    return granted.includes(required.replace(/:read$/, ":write"));
  }
  return false;
}

function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
}

function verify(
  secret: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
  toleranceSeconds = 300,
) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;
  const expected = sign(secret, timestamp, body);
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

describe("scopes", () => {
  it("honors write implying read and star", () => {
    assert.equal(hasScope(["companies:write"], "companies:read"), true);
    assert.equal(hasScope(["companies:read"], "companies:write"), false);
    assert.equal(hasScope(["*"], "bulk:write"), true);
  });
});

describe("api keys", () => {
  it("hashes deterministically", () => {
    const a = generateApiKeyMaterial();
    assert.ok(a.plaintext.startsWith("sf_live_"));
    assert.equal(hashApiKey(a.plaintext), a.hash);
  });

  it("extracts bearer and x-api-key", () => {
    const req = new Request("https://x", {
      headers: { authorization: "Bearer abc" },
    });
    assert.equal(extractBearerToken(req), "abc");
    const req2 = new Request("https://x", {
      headers: { "x-api-key": "xyz" },
    });
    assert.equal(extractBearerToken(req2), "xyz");
  });
});

describe("rate limit", () => {
  beforeEach(() => __resetMinuteBucketsForTests());

  it("blocks after limit", () => {
    assert.equal(checkMinuteRateLimit({ keyId: "k1", limit: 2 }).allowed, true);
    assert.equal(checkMinuteRateLimit({ keyId: "k1", limit: 2 }).allowed, true);
    assert.equal(checkMinuteRateLimit({ keyId: "k1", limit: 2 }).allowed, false);
  });
});

describe("webhook signature", () => {
  it("signs and verifies", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = '{"ok":true}';
    const sig = sign("whsec_test", timestamp, body);
    assert.equal(verify("whsec_test", timestamp, body, `sha256=${sig}`), true);
  });

  it("rejects stale timestamps", () => {
    const timestamp = String(Math.floor(Date.now() / 1000) - 10_000);
    const body = "{}";
    const sig = sign("whsec_test", timestamp, body);
    assert.equal(verify("whsec_test", timestamp, body, sig), false);
  });
});

describe("list query", () => {
  it("parses filters and pagination meta", () => {
    const q = parseListQuery(
      new URL(
        "https://x/api/v1/companies?page=2&pageSize=10&q=bike&leadScoreMin=50&order=asc",
      ),
    );
    assert.equal(q.page, 2);
    assert.equal(q.pageSize, 10);
    assert.equal(q.q, "bike");
    assert.equal(q.leadScoreMin, 50);
    assert.equal(q.order, "asc");
    const meta = paginationMeta({ page: 2, pageSize: 10, total: 25 });
    assert.equal(meta.totalPages, 3);
    assert.equal(meta.hasMore, true);
  });
});
