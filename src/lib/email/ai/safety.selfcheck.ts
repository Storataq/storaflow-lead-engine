/**
 * Lightweight pure checks for Phase 21K safety helpers (no test runner required).
 * Run: npx tsx src/lib/email/ai/safety.selfcheck.ts
 */

import {
  filterAllowedCrmFields,
  validateGeneratedContent,
  validateGeneratedVariables,
} from "@/lib/email/ai/safety";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const filtered = filterAllowedCrmFields({
  contactFirstName: "Ada",
  internalOnlyNote: "secret",
  salary: "high",
});
assert(filtered.fields.contactFirstName === "Ada", "allowlist first name");
assert(filtered.redacted.includes("internalOnlyNote"), "redact internal");

const vars = validateGeneratedVariables([
  "Hi {{contactFirstName}} {{unknownVar}}",
]);
assert(
  vars.some((f) => f.code === "unknown_variable"),
  "unknown variable blocked",
);

const deceptive = validateGeneratedContent({
  subject: "Re: quick question",
  body: "Act now!!!",
});
assert(
  deceptive.some((f) => f.code === "deceptive_language"),
  "deceptive subject flagged",
);

console.log("email ai safety selfcheck ok");
