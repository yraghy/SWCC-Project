"use client";

import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";

export function Sidebar() {
  const { projects, loading } = useProjects();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-white p-4 md:block">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Projects</h2>
      {loading ? (
        <div className="text-xs text-slate-400">Loading…</div>
      ) : (
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.projectId}>
              <Link
                href={`/projects/${p.projectId}`}
                className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
