"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSsoProviderAction } from "@/lib/security/actions";
import {
  SECURITY_UI,
  SSO_PROVIDER_LABELS,
  SSO_PROVIDER_TYPES,
  type SsoProviderType,
} from "@/lib/security/constants";
import type { SecuritySsoRow } from "@/lib/security/types";

type Props = { providers: SecuritySsoRow[]; canManage: boolean };

export function SsoManager({ providers, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [providerType, setProviderType] =
    useState<SsoProviderType>("oidc");
  const [displayName, setDisplayName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Per-organization identity providers: SAML 2.0, OIDC, Google Workspace,
        Entra ID, Okta, Auth0, OneLogin. {SECURITY_UI.futureLdap}.
      </p>
      {canManage ? (
        <form
          className="grid max-w-xl gap-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await createSsoProviderAction({
                providerType,
                displayName,
                issuer,
                clientId,
              });
              if (r.success) {
                toast.success(r.message);
                setDisplayName("");
                setIssuer("");
                setClientId("");
              } else toast.error(r.message);
            });
          }}
        >
          <h3 className="text-sm font-semibold">Add SSO provider (draft)</h3>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={providerType}
            onChange={(e) =>
              setProviderType(e.target.value as SsoProviderType)
            }
            aria-label="Provider type"
          >
            {SSO_PROVIDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {SSO_PROVIDER_LABELS[t]}
              </option>
            ))}
          </select>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            required
          />
          <Input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="Issuer / Entity ID"
          />
          <Input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
          />
          <Button type="submit" disabled={pending}>
            Save draft
          </Button>
        </form>
      ) : null}
      <ul className="space-y-2">
        {providers.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap gap-2">
              <span className="font-medium">{p.display_name}</span>
              <Badge variant="secondary">
                {SSO_PROVIDER_LABELS[p.provider_type as SsoProviderType] ??
                  p.provider_type}
              </Badge>
              <Badge variant="outline">{p.status}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
