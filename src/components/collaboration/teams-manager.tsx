"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTeamAction } from "@/lib/collaboration/actions";
import {
  COLLAB_UI,
  TEAM_TYPE_LABELS,
  TEAM_TYPES,
  type TeamType,
} from "@/lib/collaboration/constants";
import type { TeamRow } from "@/lib/collaboration/types";

type Props = {
  teams: Array<TeamRow & { members?: Array<{ id: string; user_id: string; role: string }> }>;
  canManage: boolean;
};

export function TeamsManager({ teams, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamType, setTeamType] = useState<TeamType>("sales");

  return (
    <div className="space-y-6">
      {canManage ? (
        <form
          className="grid max-w-xl gap-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await createTeamAction({
                code,
                name,
                description,
                teamType,
              });
              if (r.success) {
                toast.success(r.message);
                setCode("");
                setName("");
                setDescription("");
              } else toast.error(r.message);
            });
          }}
        >
          <h3 className="text-sm font-semibold">Create team space</h3>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            aria-label="Team name"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="code (sales, marketing…)"
            required
            aria-label="Team code"
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={teamType}
            onChange={(e) => setTeamType(e.target.value as TeamType)}
            aria-label="Team type"
          >
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEAM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
          />
          <Button type="submit" disabled={pending}>
            Create team
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          View only — owners and admins manage teams.
        </p>
      )}

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COLLAB_UI.emptyTeams}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="rounded-lg border border-border p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{team.name}</p>
                <Badge variant="secondary">
                  {TEAM_TYPE_LABELS[team.team_type as TeamType] ??
                    team.team_type}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{team.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Code: {team.code} · Members: {team.members?.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Shared files & pinned items ready · Activity via audit feed
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
