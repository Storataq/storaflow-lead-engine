"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  savePublicPreferencesAction,
  publicResubscribeRequestAction,
} from "@/lib/email/preferences/actions";
import type { CommunicationFrequency } from "@/lib/email/preferences/constants";
import {
  resolvePreferenceLocale,
  tp,
  type PreferenceLocale,
} from "@/lib/email/preferences/i18n";
type Category = {
  code: string;
  name: string;
  is_essential: boolean;
};

export function PreferenceCenterClient(props: {
  token: string;
  organizationName: string;
  logoUrl: string | null;
  postalAddress: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  supportEmail: string | null;
  maskedEmail: string;
  effectiveStatus: string;
  lastUpdate: string | null;
  categories: Category[];
  categoryPreferences: Record<string, boolean>;
  frequencyType: CommunicationFrequency;
  preferredLanguage: string | null;
  preferredTimezone: string | null;
  orgDefaultLanguage: string | null;
}) {
  const locale: PreferenceLocale = resolvePreferenceLocale(
    props.preferredLanguage,
    props.orgDefaultLanguage,
  );
  const [categories, setCategories] = useState(props.categoryPreferences);
  const [frequency, setFrequency] = useState(props.frequencyType);
  const [language, setLanguage] = useState(props.preferredLanguage ?? "en");
  const [timezone, setTimezone] = useState(props.preferredTimezone ?? "UTC");
  const [pauseDays, setPauseDays] = useState<number | null>(null);
  const [unsubscribeAll, setUnsubscribeAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const optionalCategories = useMemo(
    () => props.categories.filter((c) => !c.is_essential),
    [props.categories],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 space-y-3">
        {props.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.logoUrl} alt="" className="h-10 w-auto" />
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">
          {props.organizationName}
        </h1>
        <p className="text-muted-foreground">{tp(locale, "pref.subtitle")}</p>
        <p className="text-sm">
          {tp(locale, "pref.maskedEmail")}: {props.maskedEmail}
        </p>
        <p className="text-sm">
          {tp(locale, "pref.status")}: <strong>{props.effectiveStatus}</strong>
        </p>
        {props.lastUpdate ? (
          <p className="text-xs text-muted-foreground">
            {tp(locale, "pref.lastUpdate")}:{" "}
            {new Date(props.lastUpdate).toLocaleString()}
          </p>
        ) : null}
      </header>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await savePublicPreferencesAction({
              token: props.token,
              categoryPreferences: categories,
              frequencyType: frequency,
              preferredLanguage: language,
              preferredTimezone: timezone,
              pauseDays,
              unsubscribeAll,
            });
            setMessage(
              result.success ? tp(locale, "pref.saved") : result.message,
            );
          });
        }}
      >
        <section className="space-y-3" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-lg font-medium">
            {tp(locale, "pref.categories")}
          </h2>
          {optionalCategories.map((cat) => (
            <label key={cat.code} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={categories[cat.code] !== false}
                onChange={(e) =>
                  setCategories((prev) => ({
                    ...prev,
                    [cat.code]: e.target.checked,
                  }))
                }
              />
              <span>{cat.name}</span>
            </label>
          ))}
        </section>

        <section className="space-y-2">
          <Label htmlFor="frequency">{tp(locale, "pref.frequency")}</Label>
          <select
            id="frequency"
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as CommunicationFrequency)
            }
          >
            <option value="immediate">Immediate</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="every_two_weeks">Every two weeks</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="only_important">Only important</option>
            <option value="no_promotional">No promotional email</option>
          </select>
        </section>

        <section className="space-y-2">
          <Label htmlFor="pause">{tp(locale, "pref.pause")}</Label>
          <select
            id="pause"
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={pauseDays ?? ""}
            onChange={(e) =>
              setPauseDays(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">{tp(locale, "pref.noPause")}</option>
            <option value="7">{tp(locale, "pref.pause7")}</option>
            <option value="14">{tp(locale, "pref.pause14")}</option>
            <option value="30">{tp(locale, "pref.pause30")}</option>
            <option value="60">{tp(locale, "pref.pause60")}</option>
            <option value="90">{tp(locale, "pref.pause90")}</option>
          </select>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="language">{tp(locale, "pref.language")}</Label>
            <Input
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">{tp(locale, "pref.timezone")}</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            checked={unsubscribeAll}
            onChange={(e) => setUnsubscribeAll(e.target.checked)}
          />
          <span>{tp(locale, "pref.unsubscribeAll")}</span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : tp(locale, "pref.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await publicResubscribeRequestAction({
                  token: props.token,
                });
                setMessage(result.message);
                if (result.confirmUrl) {
                  window.location.href = result.confirmUrl;
                }
              });
            }}
          >
            Request resubscribe
          </Button>
        </div>

        {message ? (
          <p role="status" className="text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </form>

      <footer className="mt-10 space-y-2 border-t pt-6 text-sm text-muted-foreground">
        {props.postalAddress ? <p>{props.postalAddress}</p> : null}
        {props.supportEmail ? <p>{props.supportEmail}</p> : null}
        <div className="flex gap-4">
          {props.privacyPolicyUrl ? (
            <a href={props.privacyPolicyUrl}>{tp(locale, "pref.privacy")}</a>
          ) : null}
          {props.termsUrl ? (
            <a href={props.termsUrl}>{tp(locale, "pref.terms")}</a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

export function UnsubscribePageClient(props: {
  token: string;
  organizationName: string;
  maskedEmail: string;
  preferenceCenterUrl: string;
  categoryCode: string | null;
  preferredLanguage: string | null;
  orgDefaultLanguage: string | null;
}) {
  const locale = resolvePreferenceLocale(
    props.preferredLanguage,
    props.orgDefaultLanguage,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("no_reason_provided");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold">{props.organizationName}</h1>
      <p className="mt-2 text-muted-foreground">{tp(locale, "unsub.title")}</p>
      <p className="mt-2 text-sm">{props.maskedEmail}</p>

      {!done ? (
        <div className="mt-8 space-y-3">
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const { publicUnsubscribeAction } = await import(
                  "@/lib/email/preferences/actions"
                );
                const result = await publicUnsubscribeAction({
                  token: props.token,
                  scope: "organization",
                  reasonCode: reason as never,
                });
                setDone(result.success);
                setMessage(
                  result.success ? tp(locale, "unsub.done") : result.message,
                );
              });
            }}
          >
            {tp(locale, "unsub.confirm")}
          </Button>
          {props.categoryCode ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const { publicUnsubscribeAction } = await import(
                    "@/lib/email/preferences/actions"
                  );
                  const result = await publicUnsubscribeAction({
                    token: props.token,
                    scope: "category",
                    categoryCode: props.categoryCode,
                    reasonCode: reason as never,
                  });
                  setDone(result.success);
                  setMessage(
                    result.success ? tp(locale, "unsub.done") : result.message,
                  );
                });
              }}
            >
              {tp(locale, "unsub.category")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const { publicUnsubscribeAction } = await import(
                  "@/lib/email/preferences/actions"
                );
                const result = await publicUnsubscribeAction({
                  token: props.token,
                  scope: "temporary_pause",
                });
                setDone(result.success);
                setMessage(result.message);
              });
            }}
          >
            {tp(locale, "unsub.pause")}
          </Button>
          <a
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm"
            href={props.preferenceCenterUrl}
          >
            {tp(locale, "unsub.openPrefs")}
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <p role="status">{message ?? tp(locale, "unsub.done")}</p>
          <p className="text-sm">{tp(locale, "unsub.reasonTitle")}</p>
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="too_many_emails">Too many emails</option>
            <option value="not_relevant">Not relevant</option>
            <option value="never_signed_up">Never signed up</option>
            <option value="no_longer_interested">No longer interested</option>
            <option value="privacy_concern">Privacy concern</option>
            <option value="other">Other</option>
            <option value="no_reason_provided">No reason</option>
          </select>
        </div>
      )}
      {message && !done ? <p className="mt-4 text-sm">{message}</p> : null}
    </div>
  );
}
