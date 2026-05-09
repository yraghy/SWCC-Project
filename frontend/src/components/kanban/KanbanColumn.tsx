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

export function KanbanColumn({ status, title, tasks, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40 p-3",
        isOver && "ring-2 ring-accent",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
        <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-slate-400">
            No tasks
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.taskId} task={task} onClick={() => onSelect(task)} />)
        )}
      </div>
    </div>
  );
}
