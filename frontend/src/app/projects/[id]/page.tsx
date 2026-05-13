"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TeamFilter } from "@/components/layout/TeamFilter";
import type { Project } from "@shared/types";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const { data: projects } = useSWR<Project[]>(user ? "projects" : null, () => api.listProjects());
  const project = projects?.find((p) => p.projectId === params.id);

  if (loading || !user) return <div className="p-8 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-fg">{project?.name ?? "Project"}</h1>
              <p className="text-xs text-slate-500">{project?.description}</p>
            </div>
            <TeamFilter value={teamFilter} onChange={setTeamFilter} />
          </div>
          <KanbanBoard teamId={teamFilter || undefined} />
        </main>
      </div>
    </div>
  );
}
