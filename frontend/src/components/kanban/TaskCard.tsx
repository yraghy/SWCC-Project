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

const PRIORITY_ACCENT: Record<Task["priority"], string> = {
  low: "border-l-slate-300",
  medium: "border-l-blue-400",
  high: "border-l-amber-400",
  urgent: "border-l-red-500",
};

const PRIORITY_EMOJI: Record<Task["priority"], string> = {
  low: "🌱",
  medium: "🔹",
  high: "⚡",
  urgent: "🔥",
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
        "group cursor-pointer rounded-lg border border-l-4 border-border bg-white p-3 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-accent hover:border-l-accent hover:shadow-lift",
        PRIORITY_ACCENT[task.priority],
        isDragging && "rotate-2 scale-105 opacity-80 shadow-lift",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-fg">{task.title}</h4>
        <span className={clsx("flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", PRIORITY_COLOR[task.priority])}>
          <span aria-hidden>{PRIORITY_EMOJI[task.priority]}</span>
          {task.priority}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span aria-hidden>🗓️</span>
          {task.deadline}
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono transition-colors group-hover:bg-accent-soft group-hover:text-accent">{task.teamId}</span>
      </div>
    </div>
  );
}
