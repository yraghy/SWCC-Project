"use client";

import { useTeams } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";

interface Props {
  value: string;
  onChange: (teamId: string) => void;
}

export function TeamFilter({ value, onChange }: Props) {
  const { teams } = useTeams();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";

  if (!isManager) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-white px-2 py-1 text-sm"
      >
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t.teamId} value={t.teamId}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
