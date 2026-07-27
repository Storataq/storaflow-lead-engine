"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  publishAnnouncementAction,
  savePlatformSettingAction,
  upsertFeatureFlagAction,
} from "@/lib/platform-admin/actions";
import type {
  PlatformAnnouncementRow,
  PlatformFeatureFlagRow,
  PlatformSettingRow,
} from "@/lib/platform-admin/types";

export function FeatureFlagsManager({
  flags,
  canManage,
}: {
  flags: PlatformFeatureFlagRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="space-y-2">
      {flags.map((f) => (
        <li
          key={f.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground">
              {f.flag_key} · {f.scope}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={f.enabled ? "default" : "outline"}>
              {f.emergency_disabled
                ? "Emergency off"
                : f.enabled
                  ? "On"
                  : "Off"}
            </Badge>
            {canManage ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await upsertFeatureFlagAction({
                        flagKey: f.flag_key,
                        name: f.name,
                        description: f.description,
                        scope: f.scope,
                        enabled: !f.enabled,
                        emergencyDisabled: f.emergency_disabled,
                      });
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Toggle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await upsertFeatureFlagAction({
                        flagKey: f.flag_key,
                        name: f.name,
                        description: f.description,
                        scope: f.scope,
                        enabled: f.enabled,
                        emergencyDisabled: !f.emergency_disabled,
                      });
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Emergency
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementsManager({
  announcements,
  canManage,
}: {
  announcements: PlatformAnnouncementRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="max-w-lg space-y-2 rounded-lg border border-border p-3">
          <Label htmlFor="ann-title">Title</Label>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Label htmlFor="ann-body">Body</Label>
          <Input
            id="ann-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            type="button"
            disabled={pending || !title.trim()}
            onClick={() =>
              startTransition(async () => {
                const r = await publishAnnouncementAction({
                  title,
                  body,
                  announcementType: "feature",
                  targetScope: "all",
                });
                toast[r.success ? "success" : "error"](r.message);
                if (r.success) {
                  setTitle("");
                  setBody("");
                }
              })
            }
          >
            Publish
          </Button>
        </div>
      ) : null}
      <ul className="space-y-2">
        {announcements.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex gap-2">
              <Badge variant="outline">{a.announcement_type}</Badge>
              <Badge variant="secondary">{a.status}</Badge>
            </div>
            <p className="mt-1 font-medium">{a.title}</p>
            <p className="text-muted-foreground">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsManager({
  settings,
  canManage,
}: {
  settings: PlatformSettingRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const maintenance = settings.find((s) => s.key === "maintenance_mode");
  const isOn = maintenance?.value_json === true;

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {settings.map((s) => (
          <li
            key={s.key}
            className="rounded-lg border border-border px-3 py-2"
          >
            <p className="font-medium">{s.key}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
            <pre className="mt-1 overflow-x-auto text-xs">
              {JSON.stringify(s.value_json)}
            </pre>
          </li>
        ))}
      </ul>
      {canManage ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await savePlatformSettingAction({
                key: "maintenance_mode",
                value: !isOn,
                description: "Global maintenance mode",
              });
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          {isOn ? "Disable maintenance mode" : "Enable maintenance mode"}
        </Button>
      ) : null}
    </div>
  );
}
