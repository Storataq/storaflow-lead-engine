/**
 * Variable catalog + syntax validation (Phase 21B).
 */

export const KNOWN_TEMPLATE_VARIABLES = [
  "companyName",
  "contactFirstName",
  "contactLastName",
  "jobTitle",
  "industry",
  "city",
  "country",
  "website",
  "phone",
  "email",
  "ownerName",
  "currentDate",
  "unsubscribeLink",
  "companyDescription",
] as const;

export type KnownTemplateVariable = (typeof KNOWN_TEMPLATE_VARIABLES)[number];

/** Captures {{var}}, {{nested.path}}, and {{var|helper}}. */
export const VARIABLE_PATTERN =
  /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)(?:\|[a-zA-Z]+)?\s*\}\}/g;

const BROKEN_PLACEHOLDER_PATTERNS = [
  /\{[^{][^}]*\}/g, // single braces
  /\{\{[^}]*$/g, // unclosed
  /\{\{\s*[^a-zA-Z][^}]*\}\}/g, // invalid start
  /\{\{\s*[a-zA-Z][a-zA-Z0-9_]*\s+[^}]+\}\}/g, // spaces inside name / nested junk
];

export type VariableValidationIssue = {
  code:
    | "unknown_variable"
    | "duplicate_variable"
    | "invalid_syntax"
    | "missing_required"
    | "unused_variable"
    | "broken_placeholder";
  severity: "error" | "warning";
  message: string;
  variable?: string;
};

export type VariableValidationResult = {
  ok: boolean;
  variables: string[];
  duplicates: string[];
  unknown: string[];
  unusedDeclared: string[];
  issues: VariableValidationIssue[];
};

export function extractVariables(text: string): string[] {
  const found: string[] = [];
  const regex = new RegExp(VARIABLE_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match[1]) found.push(match[1]);
  }
  return found;
}

export function extractUniqueVariables(...parts: string[]): string[] {
  return [...new Set(parts.flatMap((part) => extractVariables(part)))];
}

export function findBrokenPlaceholders(text: string): string[] {
  const broken = new Set<string>();
  // Unclosed {{
  if (/\{\{(?:(?!\}\}).)*$/.test(text.replace(/\n/g, " "))) {
    broken.add("Unclosed {{ placeholder");
  }
  // Single {token} that looks like a variable attempt
  const single = text.match(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g) ?? [];
  for (const item of single) {
    if (!item.startsWith("{{")) broken.add(`Single-brace placeholder: ${item}`);
  }
  // {{ 123 }} or {{bad-name}} — helpers and dotted paths are allowed
  const invalid = text.match(/\{\{[^}]*\}\}/g) ?? [];
  for (const item of invalid) {
    if (
      !/\{\{\s*[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*(?:\|[a-zA-Z]+)?\s*\}\}/.test(
        item,
      )
    ) {
      broken.add(`Invalid placeholder syntax: ${item}`);
    }
  }
  void BROKEN_PLACEHOLDER_PATTERNS;
  return [...broken];
}

export function validateTemplateVariables(input: {
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody?: string | null;
  declaredVariables?: string[];
  requiredVariables?: string[];
  allowUnknown?: boolean;
}): VariableValidationResult {
  const issues: VariableValidationIssue[] = [];
  const allOccurrences = [
    ...extractVariables(input.subject),
    ...extractVariables(input.previewText ?? ""),
    ...extractVariables(input.htmlBody),
    ...extractVariables(input.textBody ?? ""),
  ];
  const variables = [...new Set(allOccurrences)];
  const counts = new Map<string, number>();
  for (const name of allOccurrences) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  // Duplicates across the template are normal (same var used twice) — flag only
  // if declared list has duplicates
  const declared = input.declaredVariables ?? [];
  const declaredDupes = declared.filter(
    (name, index) => declared.indexOf(name) !== index,
  );
  for (const name of [...new Set(declaredDupes)]) {
    issues.push({
      code: "duplicate_variable",
      severity: "warning",
      message: `Variable "${name}" is declared more than once`,
      variable: name,
    });
  }

  const known = new Set<string>(KNOWN_TEMPLATE_VARIABLES);
  const unknown = variables.filter((name) => !known.has(name));
  if (!input.allowUnknown) {
    for (const name of unknown) {
      issues.push({
        code: "unknown_variable",
        severity: "warning",
        message: `Unknown variable "{{${name}}}" — allowed for future use, verify spelling`,
        variable: name,
      });
    }
  }

  const required = input.requiredVariables ?? [];
  for (const name of required) {
    if (!variables.includes(name)) {
      issues.push({
        code: "missing_required",
        severity: "error",
        message: `Required variable "{{${name}}}" is missing`,
        variable: name,
      });
    }
  }

  const unusedDeclared = declared.filter((name) => !variables.includes(name));
  for (const name of unusedDeclared) {
    issues.push({
      code: "unused_variable",
      severity: "warning",
      message: `Declared variable "{{${name}}}" is not used in the template`,
      variable: name,
    });
  }

  const combinedText = [
    input.subject,
    input.previewText ?? "",
    input.htmlBody,
    input.textBody ?? "",
  ].join("\n");
  for (const message of findBrokenPlaceholders(combinedText)) {
    issues.push({
      code: "broken_placeholder",
      severity: "error",
      message,
    });
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  return {
    ok: !hasErrors,
    variables,
    duplicates,
    unknown,
    unusedDeclared,
    issues,
  };
}

export function isKnownVariable(name: string): boolean {
  return (KNOWN_TEMPLATE_VARIABLES as readonly string[]).includes(name);
}
