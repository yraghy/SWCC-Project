"use client";

import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";

export function Sidebar() {
  const { projects, loading } = useProjects();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-white/60 p-4 md:block">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden>📁</span> Projects
      </h2>
      {loading ? (
        <div className="text-xs text-slate-400">Loading…</div>
      ) : (
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.projectId}>
              <Link
                href={`/projects/${p.projectId}`}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 transition-all hover:translate-x-0.5 hover:bg-accent-soft hover:text-accent"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 transition-colors group-hover:bg-accent" aria-hidden />
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
