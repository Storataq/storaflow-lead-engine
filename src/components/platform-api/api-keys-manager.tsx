"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  API_PERMISSION_TIERS,
  API_PERMISSION_TIER_LABELS,
  API_KEY_STATUS_LABELS,
  API_SCOPES,
  API_SCOPE_LABELS,
  type ApiPermissionTier,
} from "@/lib/platform-api/constants";
import {
  createPlatformApiKeyAction,
  revokePlatformApiKeyAction,
  rotatePlatformApiKeyAction,
} from "@/lib/platform-api/actions";
import type { PlatformApiKeyPublic } from "@/lib/platform-api/types";

export function ApiKeysManager({
  keys,
  canManage,
}: {
  keys: PlatformApiKeyPublic[];
  canManage: boolean;
}) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<ApiPermissionTier>("read_only");
  const [expiresAt, setExpiresAt] = useState("");
  const [customScopes, setCustomScopes] = useState<string[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    if (!canManage) {
      toast.error("Only owners/admins can create API keys.");
      return;
    }
    startTransition(async () => {
      const result = await createPlatformApiKeyAction({
        name,
        permissionTier: tier,
        scopes: tier === "custom" ? customScopes : undefined,
        expiresAt: expiresAt
          ? new Date(expiresAt).toISOString()
          : null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setRevealedKey(result.plaintextKey ?? null);
      setName("");
      toast.success(result.message);
    });
  }

  return (
    <div className="space-y-8">
      {revealedKey ? (
        <div
          role="status"
          className="rounded-xl border border-border bg-muted/40 p-4"
        >
          <p className="text-sm font-medium">New API key (copy now)</p>
          <code className="mt-2 block break-all text-sm">{revealedKey}</code>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(revealedKey);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        </div>
      ) : null}

      {canManage ? (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Create API key</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="key-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Partner integration"
              />
            </div>
            <div>
              <label htmlFor="key-tier" className="text-sm font-medium">
                Permission
              </label>
              <select
                id="key-tier"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={tier}
                onChange={(e) => setTier(e.target.value as ApiPermissionTier)}
              >
                {API_PERMISSION_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {API_PERMISSION_TIER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="key-expires" className="text-sm font-medium">
                Expiration (optional)
              </label>
              <Input
                id="key-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          {tier === "custom" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Custom scopes</legend>
              <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                {API_SCOPES.filter((s) => s !== "*").map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customScopes.includes(scope)}
                      onChange={(e) => {
                        setCustomScopes((prev) =>
                          e.target.checked
                            ? [...prev, scope]
                            : prev.filter((s) => s !== scope),
                        );
                      }}
                    />
                    {API_SCOPE_LABELS[scope]}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <Button disabled={pending || !name.trim()} onClick={create}>
            Create key
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Prefix</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last used</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{key.name}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs">{key.key_prefix}…</code>
                    </td>
                    <td className="px-3 py-2">
                      {API_PERMISSION_TIER_LABELS[
                        key.permission_tier as ApiPermissionTier
                      ] ?? key.permission_tier}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">
                        {API_KEY_STATUS_LABELS[
                          key.status as keyof typeof API_KEY_STATUS_LABELS
                        ] ?? key.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || pending || key.status !== "active"}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await rotatePlatformApiKeyAction({
                                apiKeyId: key.id,
                              });
                              if (!result.success) {
                                toast.error(result.message);
                                return;
                              }
                              setRevealedKey(result.plaintextKey ?? null);
                              toast.success(result.message);
                            })
                          }
                        >
                          Rotate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canManage || pending || key.status === "revoked"}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await revokePlatformApiKeyAction({
                                apiKeyId: key.id,
                              });
                              if (!result.success) toast.error(result.message);
                              else toast.success(result.message);
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
