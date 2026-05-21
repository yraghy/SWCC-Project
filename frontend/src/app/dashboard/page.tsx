"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TeamFilter } from "@/components/layout/TeamFilter";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskForm } from "@/components/tasks/TaskForm";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [teamFilter, setTeamFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
        Loading…
      </div>
    );
  }

  const isManager = user.role === "manager" || user.role === "admin";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-fg">
                <span aria-hidden>🗂️</span> Board
              </h1>
              <p className="text-xs text-slate-500">
                {isManager ? "Viewing all tasks across the company" : `Viewing tasks for your team (${user.teamId})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TeamFilter value={teamFilter} onChange={setTeamFilter} />
              {isManager && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-lg bg-brand-gradient px-3.5 py-1.5 text-sm font-semibold text-white shadow-lift transition-all hover:brightness-110 active:scale-95"
                >
                  + New task
                </button>
              )}
            </div>
          </div>
          <KanbanBoard key={`${teamFilter}-${refreshKey}`} teamId={teamFilter || undefined} />
        </main>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-xl animate-pop-in rounded-2xl border border-border bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg">
              <span aria-hidden>✨</span> Create task
            </h2>
            <TaskForm
              onCreated={() => setRefreshKey((k) => k + 1)}
              onClose={() => setCreateOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
