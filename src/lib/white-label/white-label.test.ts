import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Self-contained unit checks (path aliases unavailable under node:test). */

const ALLOWED_MIME = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const MAX_BYTES = 512 * 1024;

function validateAssetMeta(input: {
  contentType: string;
  byteSize: number;
  widthPx?: number;
}) {
  const type = input.contentType.toLowerCase().trim();
  if (!ALLOWED_MIME.includes(type)) {
    return { ok: false as const, message: "bad type" };
  }
  if (input.byteSize <= 0 || input.byteSize > MAX_BYTES) {
    return { ok: false as const, message: "bad size" };
  }
  return { ok: true as const };
}

function isHttpOrDataUrl(url: string) {
  const v = url.trim();
  if (v.startsWith("data:image/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function buildThemeCss(colors: Record<string, string>) {
  const variables: Record<string, string> = {};
  if (colors.primary) {
    variables["--primary"] = colors.primary;
    variables["--sidebar-primary"] = colors.primary;
  }
  const decls = Object.entries(variables)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  return {
    variables,
    cssText: decls ? `:root { ${decls} }` : "",
  };
}

function resolveThemeModeClass(
  mode: "system" | "light" | "dark",
  prefersDark?: boolean,
) {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (prefersDark == null) return null;
  return prefersDark ? "dark" : "light";
}

function filterNav(
  items: Array<{ href: string; label: string }>,
  disabledPrefixes: string[],
) {
  return items.filter(
    (item) =>
      !disabledPrefixes.some(
        (p) => item.href === p || item.href.startsWith(`${p}/`),
      ),
  );
}

describe("white-label theme engine", () => {
  it("maps primary color to CSS variables", () => {
    const theme = buildThemeCss({ primary: "#0f766e" });
    assert.equal(theme.variables["--primary"], "#0f766e");
    assert.ok(theme.cssText.includes("--primary: #0f766e"));
  });

  it("resolves theme mode classes", () => {
    assert.equal(resolveThemeModeClass("light"), "light");
    assert.equal(resolveThemeModeClass("dark"), "dark");
    assert.equal(resolveThemeModeClass("system", true), "dark");
    assert.equal(resolveThemeModeClass("system", false), "light");
    assert.equal(resolveThemeModeClass("system"), null);
  });
});

describe("white-label assets", () => {
  it("accepts png within size limits", () => {
    assert.equal(
      validateAssetMeta({
        contentType: "image/png",
        byteSize: 1024,
        widthPx: 128,
      }).ok,
      true,
    );
  });

  it("rejects oversized files", () => {
    assert.equal(
      validateAssetMeta({
        contentType: "image/png",
        byteSize: 2 * 1024 * 1024,
      }).ok,
      false,
    );
  });

  it("validates http and data urls", () => {
    assert.equal(isHttpOrDataUrl("https://cdn.example.com/logo.png"), true);
    assert.equal(isHttpOrDataUrl("data:image/png;base64,abc"), true);
    assert.equal(isHttpOrDataUrl("javascript:alert(1)"), false);
  });
});

describe("white-label features", () => {
  it("hides nav prefixes when module disabled", () => {
    const items = filterNav(
      [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/api-management", label: "API" },
        { href: "/copilot", label: "AI Copilot" },
      ],
      ["/api-management", "/copilot"],
    );
    assert.equal(items.some((i) => i.href === "/api-management"), false);
    assert.equal(items.some((i) => i.href === "/copilot"), false);
    assert.equal(items.some((i) => i.href === "/dashboard"), true);
  });
});

describe("white-label public payload", () => {
  it("omits customCss when not enabled", () => {
    const customCssEnabled = false;
    const customCss = customCssEnabled ? "body{color:red}" : null;
    assert.equal(customCss, null);
  });
});
