"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomRoleAction } from "@/lib/security/actions";
import {
  ORG_SECURITY_ROLE_LABELS,
  ORG_SECURITY_ROLES,
  ROLE_TEMPLATES,
  SECURITY_PERMISSION_RESOURCE_LABELS,
  type OrgSecurityRole,
} from "@/lib/security/constants";
import { previewPermissions } from "@/lib/security/permissions";
import type { SecurityCustomRoleRow } from "@/lib/security/types";

type Props = { roles: SecurityCustomRoleRow[]; canManage: boolean };

export function RolesManager({ roles, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [previewRole, setPreviewRole] = useState<OrgSecurityRole>("member");

  const preview = previewPermissions(previewRole);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Built-in role permission preview</h3>
        <select
          className="mt-2 h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={previewRole}
          onChange={(e) => setPreviewRole(e.target.value as OrgSecurityRole)}
          aria-label="Preview role"
        >
          {ORG_SECURITY_ROLES.map((r) => (
            <option key={r} value={r}>
              {ORG_SECURITY_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {Object.entries(preview).map(([resource, actions]) => (
            <li key={resource}>
              <span className="font-medium text-foreground">
                {SECURITY_PERMISSION_RESOURCE_LABELS[
                  resource as keyof typeof SECURITY_PERMISSION_RESOURCE_LABELS
                ] ?? resource}
              </span>
              : {(actions as string[]).join(", ")}
            </li>
          ))}
        </ul>
      </div>

      {canManage ? (
        <form
          className="grid max-w-xl gap-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await createCustomRoleAction({
                code,
                name,
                fromTemplate: template || undefined,
              });
              if (r.success) {
                toast.success(r.message);
                setCode("");
                setName("");
              } else toast.error(r.message);
            });
          }}
        >
          <h3 className="text-sm font-semibold">Custom role</h3>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="code"
            required
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            aria-label="Template"
          >
            <option value="">No template</option>
            {ROLE_TEMPLATES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={pending}>
            Create role
          </Button>
        </form>
      ) : null}

      <ul className="space-y-2">
        {roles.map((role) => (
          <li
            key={role.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap gap-2">
              <span className="font-medium">{role.name}</span>
              <Badge variant="outline">{role.code}</Badge>
              {role.is_template ? <Badge>Template</Badge> : null}
            </div>
            <p className="text-muted-foreground">{role.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
