"use client";

import { useEffect } from "react";
import { useTask } from "@/hooks/useTasks";
import { CommentThread } from "./CommentThread";

interface Props {
  taskId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, onClose }: Props) {
  const { task, loading } = useTask(taskId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl animate-pop-in rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !task ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{task.teamId} · {task.priority}</div>
                <h2 className="mt-1 text-xl font-semibold text-fg">{task.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm text-slate-700">{task.description || "No description."}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="Status" value={task.status} />
              <Field label="Deadline" value={task.deadline} />
              <Field label="Assignee" value={task.assigneeId} />
              <Field label="Project" value={task.projectId} />
            </dl>

            <div className="mt-6 border-t border-border pt-4">
              <CommentThread taskId={task.taskId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}
