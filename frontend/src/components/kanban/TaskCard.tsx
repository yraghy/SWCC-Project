"use client";

import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import type { Task } from "@shared/types";

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
};

interface Props {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.taskId });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm hover:border-accent",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-fg">{task.title}</h4>
        <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", PRIORITY_COLOR[task.priority])}>
          {task.priority}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{task.deadline}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{task.teamId}</span>
      </div>
    </div>
  );
}
