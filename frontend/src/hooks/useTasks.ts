"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Task, TaskStatus } from "@shared/types";

export function useTasks(filter: { teamId?: string; status?: TaskStatus } = {}) {
  const key = ["tasks", filter.teamId ?? "*", filter.status ?? "*"].join("|");
  const { data, error, isLoading, mutate } = useSWR<Task[]>(key, () => api.listTasks(filter));
  return { tasks: data ?? [], error, loading: isLoading, refresh: () => mutate() };
}

export function useTask(taskId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task | null>(
    taskId ? ["task", taskId].join("|") : null,
    () => (taskId ? api.getTask(taskId) : Promise.resolve(null)),
  );
  return { task: data ?? null, error, loading: isLoading, refresh: () => mutate() };
}
