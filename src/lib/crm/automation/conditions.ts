/**
 * Condition evaluation against a run context.
 */

export type AutomationContext = Record<string, unknown>;

export type ConditionRule = {
  field: string;
  operator: string;
  value?: string | number | boolean | null;
};

function readField(ctx: AutomationContext, field: string): unknown {
  if (field in ctx) return ctx[field];
  const payload = ctx.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return (payload as Record<string, unknown>)[field] ?? null;
  }
  return null;
}

export function evaluateCondition(
  ctx: AutomationContext,
  rule: ConditionRule,
): boolean {
  const left = readField(ctx, rule.field);
  const right = rule.value;
  const op = rule.operator;

  if (op === "is_empty") return left == null || left === "";
  if (op === "is_not_empty") return left != null && left !== "";

  if (typeof left === "number" || typeof right === "number") {
    const l = Number(left);
    const r = Number(right);
    if (!Number.isFinite(l) || !Number.isFinite(r)) return false;
    if (op === "gt" || op === "greater_than") return l > r;
    if (op === "gte") return l >= r;
    if (op === "lt" || op === "less_than") return l < r;
    if (op === "lte") return l <= r;
    if (op === "eq" || op === "equals") return l === r;
    if (op === "neq") return l !== r;
  }

  const ls = String(left ?? "").toLowerCase();
  const rs = String(right ?? "").toLowerCase();
  if (op === "eq" || op === "equals") return ls === rs;
  if (op === "neq" || op === "not_equals") return ls !== rs;
  if (op === "contains") return ls.includes(rs);
  if (op === "eq" && typeof right === "boolean") return Boolean(left) === right;

  return Boolean(left) === Boolean(right);
}

export function evaluateAllConditions(
  ctx: AutomationContext,
  rules: ConditionRule[] | undefined,
): boolean {
  if (!rules?.length) return true;
  return rules.every((rule) => evaluateCondition(ctx, rule));
}
