/**
 * Preferred contact / email selection for campaign readiness.
 */

export type SelectableContact = {
  id?: string | null;
  email: string;
  name?: string | null;
  phone?: string | null;
  category?: string | null;
  verification?: string | null;
  confidence?: number;
  isNamed?: boolean;
  reviewAccepted?: boolean;
};

function scoreContact(c: SelectableContact, allowRole: boolean): number {
  let score = c.confidence ?? 40;
  const email = c.email.toLowerCase();
  const local = email.split("@")[0] ?? "";
  const isRole = [
    "info",
    "sales",
    "contact",
    "support",
    "hello",
    "office",
  ].includes(local);

  if (c.reviewAccepted && c.isNamed) score += 40;
  else if (c.isNamed) score += 25;
  if (local === "sales") score += 18;
  else if (isRole && allowRole) score += 10;
  else if (isRole && !allowRole) score -= 20;
  if (c.verification === "syntax_valid" || c.verification === "verified") {
    score += 12;
  }
  if (c.verification === "invalid") score -= 50;
  if (c.name?.trim()) score += 8;
  return score;
}

export function selectPreferredContact(input: {
  contacts: SelectableContact[];
  allowRoleEmails: boolean;
}): {
  preferred: SelectableContact | null;
  alternatives: Array<SelectableContact & { score: number; reason: string }>;
  reasons: string[];
} {
  const ranked = input.contacts
    .filter((c) => c.email?.includes("@"))
    .map((c) => {
      const score = scoreContact(c, input.allowRoleEmails);
      let reason = "Scored contact candidate";
      if (c.isNamed && c.reviewAccepted) reason = "Accepted named contact";
      else if (c.isNamed) reason = "Named contact";
      else if ((c.email.split("@")[0] ?? "") === "sales") reason = "Sales role email";
      else if (["info", "contact", "hello", "office"].includes(c.email.split("@")[0] ?? "")) {
        reason = "General business email";
      }
      return { ...c, score, reason };
    })
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      preferred: null,
      alternatives: [],
      reasons: ["No email contacts available"],
    };
  }

  const preferred = ranked[0];
  return {
    preferred,
    alternatives: ranked.slice(1, 6),
    reasons: [`Selected: ${preferred.reason} (score ${preferred.score})`],
  };
}
