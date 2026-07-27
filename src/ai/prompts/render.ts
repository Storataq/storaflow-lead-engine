/**
 * Client-safe prompt template rendering.
 */

export function renderPromptTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}
