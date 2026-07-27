/**
 * Phase 21L pure self-check (no DB). Run with:
 * npx tsx --eval "import('./src/lib/email/ops/security.ts').then(m=>{console.log(m.isSafeHttpUrl('https://a.com'), !m.isSafeHttpUrl('javascript:alert(1)'))})"
 */

import {
  isSafeHttpUrl,
  escapeCsvCell,
  timingSafeStringEqual,
  parseAllowlist,
} from "@/lib/email/ops/security";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isSafeHttpUrl("https://example.com/a"), "https ok");
assert(!isSafeHttpUrl("javascript:alert(1)"), "js blocked");
assert(!isSafeHttpUrl("data:text/html,hi"), "data blocked");
assert(escapeCsvCell("=cmd").startsWith("'"), "csv escape");
assert(timingSafeStringEqual("abc", "abc"), "timing equal");
assert(!timingSafeStringEqual("abc", "abd"), "timing unequal");
assert(parseAllowlist("a@example.com, b@x.com").length === 2, "allowlist");

console.log("email ops security selfcheck ok");
