"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import type { Task, TaskStatus } from "@shared/types";
import { TaskCard } from "./TaskCard";

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onSelect: (task: Task) => void;
}

const COLUMN_META: Record<TaskStatus, { emoji: string; accent: string; empty: string }> = {
  todo: { emoji: "📋", accent: "bg-slate-400", empty: "Nothing here yet ✨" },
  in_progress: { emoji: "🚧", accent: "bg-blue-500", empty: "Idle hands…" },
  in_review: { emoji: "👀", accent: "bg-amber-500", empty: "Nothing to review" },
  done: { emoji: "✅", accent: "bg-emerald-500", empty: "No wins yet 🏆" },
};

export function KanbanColumn({ status, title, tasks, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40 p-3 transition-all duration-200",
        isOver && "ring-2 ring-accent ring-offset-2 ring-offset-transparent scale-[1.01] bg-accent-soft/50",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-600">
          <span aria-hidden>{meta.emoji}</span>
          {title}
          <span className={clsx("h-1.5 w-1.5 rounded-full", meta.accent)} aria-hidden />
        </h3>
        <span
          key={tasks.length}
          className="animate-pop-in rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-card"
        >
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-slate-400">
            {meta.empty}
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.taskId} task={task} onClick={() => onSelect(task)} />)
        )}
      </div>
    </div>
  );
}
