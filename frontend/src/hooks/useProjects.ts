"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Project, Team, User } from "@shared/types";

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>("projects", () => api.listProjects());
  return { projects: data ?? [], error, loading: isLoading, refresh: () => mutate() };
}

export function useTeams() {
  const { data, error, isLoading } = useSWR<Team[]>("teams", () => api.listTeams());
  return { teams: data ?? [], error, loading: isLoading };
}

export function useUsers(teamId?: string) {
  const { data, error, isLoading } = useSWR<User[]>(["users", teamId ?? "*"].join("|"), () => api.listUsers(teamId));
  return { users: data ?? [], error, loading: isLoading };
}
