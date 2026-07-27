import type { ConditionOperator } from "@/lib/email/sequence/constants";
import type { SequenceConditionConfig } from "@/lib/email/sequence/steps";

export type ConditionEvaluationInput = {
  qualificationScore?: number | null;
  opportunityScore?: number | null;
  validationStatus?: string | null;
  suppressionStatus?: string | null;
  campaignApprovalStatus?: string | null;
  // Merge variables snapshot (email_recipients.personalization_json).
  personalizationJson?: Record<string, unknown> | null;
  // Execution-time flags (placeholders for future delivery events).
  manualFlag?: boolean;
};

function pickPersonalizationValue(
  personalizationJson: Record<string, unknown> | null | undefined,
  field: string,
): unknown {
  if (!personalizationJson) return undefined;
  if (field in personalizationJson) return personalizationJson[field];

  // Convenience aliases for common snake/camel variations.
  const snake = field;
  const camel = field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const upperSnake = snake.toUpperCase();
  return (
    personalizationJson[camel] ??
    personalizationJson[snake] ??
    personalizationJson[upperSnake] ??
    undefined
  );
}

export function evaluateCondition(
  config: SequenceConditionConfig,
  input: ConditionEvaluationInput,
): { matched: boolean; actual: unknown } {
  const op: ConditionOperator = config.operator;
  const field = config.field;
  const expected = config.value;

  const actual = (() => {
    switch (field) {
      case "qualification_score":
        return input.qualificationScore ?? null;
      case "opportunity_score":
        return input.opportunityScore ?? null;
      case "contact_validation_status":
      case "validation_status":
        return input.validationStatus ?? null;
      case "campaign_approval_status":
        return input.campaignApprovalStatus ?? null;
      case "manual_flag":
        return input.manualFlag ?? false;
      case "lead_status":
      case "pipeline_stage":
        return pickPersonalizationValue(input.personalizationJson, field);
      default:
        return pickPersonalizationValue(input.personalizationJson, field);
    }
  })();

  const isEmpty = (v: unknown): boolean => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return !v.trim();
    return false;
  };

  const toComparableNumber = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const actualStr = actual === null || actual === undefined ? "" : String(actual);

  const matches = (() => {
    switch (op) {
      case "equals":
        return actualStr.toLowerCase() === String(expected ?? "").toLowerCase();
      case "not_equals":
        return actualStr.toLowerCase() !== String(expected ?? "").toLowerCase();
      case "greater_than": {
        const a = toComparableNumber(actual);
        const b = typeof expected === "number" ? expected : Number(expected);
        if (a === null || !Number.isFinite(b)) return false;
        return a > b;
      }
      case "less_than": {
        const a = toComparableNumber(actual);
        const b = typeof expected === "number" ? expected : Number(expected);
        if (a === null || !Number.isFinite(b)) return false;
        return a < b;
      }
      case "greater_than_or_equal": {
        const a = toComparableNumber(actual);
        const b = typeof expected === "number" ? expected : Number(expected);
        if (a === null || !Number.isFinite(b)) return false;
        return a >= b;
      }
      case "less_than_or_equal": {
        const a = toComparableNumber(actual);
        const b = typeof expected === "number" ? expected : Number(expected);
        if (a === null || !Number.isFinite(b)) return false;
        return a <= b;
      }
      case "contains":
        return actualStr
          .toLowerCase()
          .includes(String(expected ?? "").toLowerCase());
      case "does_not_contain":
        return !actualStr
          .toLowerCase()
          .includes(String(expected ?? "").toLowerCase());
      case "is_empty":
        return isEmpty(actual);
      case "is_not_empty":
        return !isEmpty(actual);
      case "in": {
        const list = Array.isArray(expected) ? expected : [];
        return list.map(String).map((s) => s.toLowerCase()).includes(actualStr.toLowerCase());
      }
      case "not_in": {
        const list = Array.isArray(expected) ? expected : [];
        return !list.map(String).map((s) => s.toLowerCase()).includes(actualStr.toLowerCase());
      }
      default:
        return false;
    }
  })();

  return { matched: Boolean(matches), actual };
}

