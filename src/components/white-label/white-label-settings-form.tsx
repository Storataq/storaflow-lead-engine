"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  WHITE_LABEL_COLOR_KEYS,
  WHITE_LABEL_COLOR_LABELS,
  WHITE_LABEL_FEATURE_MODULES,
  WHITE_LABEL_FEATURE_LABELS,
  WHITE_LABEL_LOGO_SLOTS,
  WHITE_LABEL_LOGO_SLOT_LABELS,
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
  THEME_MODES,
  THEME_MODE_LABELS,
  DOMAIN_STATUS_LABELS,
  type WhiteLabelLogoSlot,
} from "@/lib/white-label/constants";
import {
  addCustomDomainAction,
  createPartnerAccountAction,
  removeCustomDomainAction,
  saveWhiteLabelAssetAction,
  saveWhiteLabelConfigAction,
} from "@/lib/white-label/actions";
import { buildThemeCss } from "@/lib/white-label/theme-engine";
import type {
  CustomDomainRow,
  PartnerAccountRow,
  WhiteLabelConfig,
} from "@/lib/white-label/types";

type PreviewDevice = "desktop" | "tablet" | "mobile" | "email";

type Props = {
  initialConfig: WhiteLabelConfig;
  domains: CustomDomainRow[];
  partners: PartnerAccountRow[];
  canManage: boolean;
  themeCss: string;
};

export function WhiteLabelSettingsForm({
  initialConfig,
  domains,
  partners,
  canManage,
  themeCss,
}: Props) {
  const [config, setConfig] = useState<WhiteLabelConfig>(initialConfig);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const liveTheme = useMemo(() => buildThemeCss(config), [config]);

  useEffect(() => {
    // Live inject preview vars into a scoped style tag
    const id = "wl-preview-theme";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = liveTheme.cssText
      ? `${liveTheme.cssText} #wl-live-preview { ${Object.entries(
          liveTheme.variables,
        )
          .map(([k, v]) => `${k}: ${v};`)
          .join(" ")} }`
      : "";
    return () => {
      /* keep style for session while on page */
    };
  }, [liveTheme]);

  function patch<K extends keyof WhiteLabelConfig>(
    key: K,
    value: WhiteLabelConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    if (!canManage) {
      toast.error("Only owners/admins can edit White Label settings.");
      return;
    }
    startTransition(async () => {
      const result = await saveWhiteLabelConfigAction(config);
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
    });
  }

  async function onAssetFile(slot: WhiteLabelLogoSlot, file: File | null) {
    if (!file || !canManage) return;
    const dataUrl = await readFileAsDataUrl(file);
    const result = await saveWhiteLabelAssetAction({
      slot,
      contentType: file.type || "image/png",
      dataUrl,
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setConfig((prev) => ({
      ...prev,
      logos: { ...prev.logos, [slot]: dataUrl },
    }));
    toast.success(result.message);
  }

  const previewWidth =
    device === "desktop"
      ? "100%"
      : device === "tablet"
        ? "768px"
        : device === "mobile"
          ? "390px"
          : "100%";

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_minmax(280px,420px)]">
      <div className="space-y-8">
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">General branding</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Application name">
              <Input
                value={config.applicationName}
                disabled={!canManage}
                onChange={(e) => patch("applicationName", e.target.value)}
              />
            </Field>
            <Field label="Tagline">
              <Input
                value={config.tagline}
                disabled={!canManage}
                onChange={(e) => patch("tagline", e.target.value)}
              />
            </Field>
            <Field label="Support email">
              <Input
                value={config.supportEmail}
                disabled={!canManage}
                onChange={(e) => patch("supportEmail", e.target.value)}
              />
            </Field>
            <Field label="Support phone">
              <Input
                value={config.supportPhone}
                disabled={!canManage}
                onChange={(e) => patch("supportPhone", e.target.value)}
              />
            </Field>
            <Field label="Support website">
              <Input
                value={config.supportWebsite}
                disabled={!canManage}
                onChange={(e) => patch("supportWebsite", e.target.value)}
              />
            </Field>
            <Field label="Terms URL">
              <Input
                value={config.termsUrl}
                disabled={!canManage}
                onChange={(e) => patch("termsUrl", e.target.value)}
              />
            </Field>
            <Field label="Privacy URL">
              <Input
                value={config.privacyUrl}
                disabled={!canManage}
                onChange={(e) => patch("privacyUrl", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Logos & icons</h2>
          <p className="text-xs text-muted-foreground">
            SVG, PNG, JPG, WEBP, ICO — max 512 KB. Or paste an HTTPS URL.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHITE_LABEL_LOGO_SLOTS.filter(
              (s) => !s.startsWith("login_"),
            ).map((slot) => (
              <div key={slot} className="space-y-2">
                <label className="text-sm font-medium">
                  {WHITE_LABEL_LOGO_SLOT_LABELS[slot]}
                </label>
                <Input
                  value={config.logos[slot] ?? ""}
                  disabled={!canManage}
                  placeholder="https://… or upload"
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      logos: { ...prev.logos, [slot]: e.target.value },
                    }))
                  }
                />
                <Input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp,.ico,image/*"
                  disabled={!canManage}
                  onChange={(e) =>
                    void onAssetFile(slot, e.target.files?.[0] ?? null)
                  }
                />
                {config.logos[slot] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logos[slot]}
                    alt=""
                    className="h-10 w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Color system</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WHITE_LABEL_COLOR_KEYS.map((key) => (
              <Field key={key} label={WHITE_LABEL_COLOR_LABELS[key]}>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="h-8 w-12 p-1"
                    value={
                      /^#[0-9a-f]{6}$/i.test(config.colors[key] ?? "")
                        ? (config.colors[key] as string)
                        : "#0f172a"
                    }
                    disabled={!canManage}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        colors: { ...prev.colors, [key]: e.target.value },
                      }))
                    }
                  />
                  <Input
                    value={config.colors[key] ?? ""}
                    disabled={!canManage}
                    placeholder="#0f172a or oklch(…)"
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        colors: { ...prev.colors, [key]: e.target.value },
                      }))
                    }
                  />
                </div>
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Typography</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["primaryFont", "Primary font"],
                ["headingFont", "Heading font"],
                ["bodyFont", "Body font"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <select
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={config.typography[key]}
                  disabled={!canManage}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      typography: {
                        ...prev.typography,
                        [key]: e.target.value,
                      },
                    }))
                  }
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <Field label="Font scale">
              <select
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={config.typography.fontScale}
                disabled={!canManage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    typography: {
                      ...prev.typography,
                      fontScale: e.target
                        .value as WhiteLabelConfig["typography"]["fontScale"],
                    },
                  }))
                }
              >
                {FONT_SCALE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Theme mode">
              <select
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={config.themeMode}
                disabled={!canManage}
                onChange={(e) =>
                  patch(
                    "themeMode",
                    e.target.value as WhiteLabelConfig["themeMode"],
                  )
                }
              >
                {THEME_MODES.map((m) => (
                  <option key={m} value={m}>
                    {THEME_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Login experience</h2>
          <Field label="Welcome message">
            <Input
              value={config.login.welcomeMessage}
              disabled={!canManage}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  login: { ...prev.login, welcomeMessage: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Background URL">
            <Input
              value={config.login.backgroundUrl}
              disabled={!canManage}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  login: { ...prev.login, backgroundUrl: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Hero image URL">
            <Input
              value={config.login.heroImageUrl}
              disabled={!canManage}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  login: { ...prev.login, heroImageUrl: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Footer text">
            <Input
              value={config.login.footerText}
              disabled={!canManage}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  login: { ...prev.login, footerText: e.target.value },
                }))
              }
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Email branding</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email logo URL">
              <Input
                value={config.email.logoUrl}
                disabled={!canManage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    email: { ...prev.email, logoUrl: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="From name">
              <Input
                value={config.email.fromName}
                disabled={!canManage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    email: { ...prev.email, fromName: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Powered-by line">
              <Input
                value={config.email.footerPoweredBy}
                disabled={!canManage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    email: { ...prev.email, footerPoweredBy: e.target.value },
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.email.hidePoweredBy}
                disabled={!canManage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    email: { ...prev.email, hidePoweredBy: e.target.checked },
                  }))
                }
              />
              Hide powered-by line
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Feature toggles</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {WHITE_LABEL_FEATURE_MODULES.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.features[mod] !== false}
                  disabled={!canManage}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      features: {
                        ...prev.features,
                        [mod]: e.target.checked,
                      },
                    }))
                  }
                />
                {WHITE_LABEL_FEATURE_LABELS[mod]}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Custom CSS / JS (future-ready)</h2>
          <p className="text-xs text-muted-foreground">
            Stored and versioned; execution gated until sandbox policy is
            enabled.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.customCssEnabled}
              disabled={!canManage}
              onChange={(e) => patch("customCssEnabled", e.target.checked)}
            />
            Enable custom CSS (not executed yet)
          </label>
          <Textarea
            value={config.customCss}
            disabled={!canManage}
            rows={4}
            placeholder="/* future custom CSS */"
            onChange={(e) => patch("customCss", e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.customJsEnabled}
              disabled={!canManage}
              onChange={(e) => patch("customJsEnabled", e.target.checked)}
            />
            Enable custom JavaScript (not executed yet)
          </label>
          <Textarea
            value={config.customJs}
            disabled={!canManage}
            rows={3}
            placeholder="// future custom JS"
            onChange={(e) => patch("customJs", e.target.value)}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Custom domains</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="app.partner.com"
              value={hostname}
              disabled={!canManage}
              onChange={(e) => setHostname(e.target.value)}
            />
            <Button
              disabled={!canManage || pending || !hostname.trim()}
              onClick={() =>
                startTransition(async () => {
                  const result = await addCustomDomainAction({ hostname });
                  if (!result.success) toast.error(result.message);
                  else {
                    toast.success(result.message);
                    setHostname("");
                  }
                })
              }
            >
              Add domain
            </Button>
          </div>
          <ul className="space-y-2">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  <code>{d.hostname}</code>{" "}
                  <Badge variant="secondary">
                    {DOMAIN_STATUS_LABELS[
                      d.status as keyof typeof DOMAIN_STATUS_LABELS
                    ] ?? d.status}
                  </Badge>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canManage || pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await removeCustomDomainAction({
                        domainId: d.id,
                      });
                      if (!result.success) toast.error(result.message);
                      else toast.success(result.message);
                    })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Partner portal</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-[10rem]"
              placeholder="code"
              value={partnerCode}
              disabled={!canManage}
              onChange={(e) => setPartnerCode(e.target.value)}
            />
            <Input
              className="max-w-xs"
              placeholder="Partner name"
              value={partnerName}
              disabled={!canManage}
              onChange={(e) => setPartnerName(e.target.value)}
            />
            <Button
              disabled={
                !canManage || pending || !partnerCode.trim() || !partnerName.trim()
              }
              onClick={() =>
                startTransition(async () => {
                  const result = await createPartnerAccountAction({
                    code: partnerCode,
                    name: partnerName,
                  });
                  if (!result.success) toast.error(result.message);
                  else {
                    toast.success(result.message);
                    setPartnerCode("");
                    setPartnerName("");
                  }
                })
              }
            >
              Create partner
            </Button>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {partners.map((p) => (
              <li key={p.id}>
                <Badge variant="outline">{p.code}</Badge> {p.name} · {p.status}
              </li>
            ))}
            {partners.length === 0 ? (
              <li>No partner accounts yet.</li>
            ) : null}
          </ul>
        </section>

        <Button disabled={!canManage || pending} onClick={save}>
          Save White Label settings
        </Button>
        {!themeCss ? null : (
          <p className="text-xs text-muted-foreground">
            Active theme cache is applied in the app shell for this organization.
          </p>
        )}
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["desktop", "Desktop"],
              ["tablet", "Tablet"],
              ["mobile", "Mobile"],
              ["email", "Email"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={device === id ? "default" : "outline"}
              onClick={() => setDevice(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div
          id="wl-live-preview"
          className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
          style={{
            width: previewWidth,
            maxWidth: "100%",
            marginInline: "auto",
          }}
        >
          {device === "email" ? (
            <div className="space-y-3 p-4 text-sm">
              {config.email.logoUrl || config.logos.email_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.email.logoUrl || config.logos.email_logo}
                  alt=""
                  className="h-8 w-auto"
                  loading="lazy"
                />
              ) : null}
              <p className="font-medium">{config.email.fromName}</p>
              <p className="text-muted-foreground">
                Invitation / reset / report sample body…
              </p>
              {!config.email.hidePoweredBy ? (
                <p className="text-xs text-muted-foreground">
                  {config.email.footerPoweredBy}
                </p>
              ) : null}
            </div>
          ) : (
            <div
              className="min-h-[320px] p-4"
              style={
                config.login.backgroundUrl
                  ? {
                      backgroundImage: `url(${config.login.backgroundUrl})`,
                      backgroundSize: "cover",
                    }
                  : undefined
              }
            >
              <div className="rounded-lg border border-border/80 bg-background/95 p-4 backdrop-blur">
                <BrandMark
                  href={undefined}
                  productName={config.applicationName}
                  logoUrl={
                    config.logos.login_logo ||
                    config.logos.primary_logo ||
                    config.logos.sidebar_logo
                  }
                />
                <p className="mt-3 text-lg font-semibold">
                  {config.login.welcomeMessage}
                </p>
                <p className="text-sm text-muted-foreground">{config.tagline}</p>
                {config.login.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.login.heroImageUrl}
                    alt=""
                    className="mt-3 max-h-28 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="mt-4 space-y-2">
                  <div className="h-8 rounded-md border border-input bg-muted/40" />
                  <div className="h-8 rounded-md border border-input bg-muted/40" />
                  <div className="h-8 rounded-md bg-primary" />
                </div>
                {config.login.footerText ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {config.login.footerText}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
