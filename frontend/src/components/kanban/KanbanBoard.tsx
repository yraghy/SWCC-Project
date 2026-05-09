"use client";

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useTasks } from "@/hooks/useTasks";
import type { Task, TaskStatus } from "@shared/types";
import { TASK_STATUSES } from "@shared/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskModal } from "@/components/tasks/TaskModal";

const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

interface Props {
  teamId?: string;
}

export function KanbanBoard({ teamId }: Props) {
  const { tasks, loading, refresh } = useTasks({ teamId });
  const [selected, setSelected] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus || !TASK_STATUSES.includes(newStatus)) return;

    const task = tasks.find((t) => t.taskId === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await api.updateTask(taskId, { status: newStatus });
      await refresh();
      toast.success(`Moved to ${COLUMN_TITLES[newStatus]}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading tasks…</div>;
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              title={COLUMN_TITLES[status]}
              tasks={tasks.filter((t) => t.status === status)}
              onSelect={(t) => setSelected(t)}
            />
          ))}
        </div>
      </DndContext>
      {selected && (
        <TaskModal
          taskId={selected.taskId}
          onClose={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
