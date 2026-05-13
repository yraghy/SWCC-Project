"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProjects, useTeams, useUsers } from "@/hooks/useProjects";
import type { Priority } from "@shared/types";

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export function TaskForm({ onCreated, onClose }: Props) {
  const { projects } = useProjects();
  const { teams } = useTeams();
  const [teamId, setTeamId] = useState("");
  const { users } = useUsers(teamId || undefined);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !projectId || !teamId || !assigneeId || !deadline) {
      toast.error("Fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.createTask({ title, description, priority, deadline, projectId, teamId, assigneeId });
      toast.success("Task created");
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Title" value={title} onChange={setTitle} required />
      <Textarea label="Description" value={description} onChange={setDescription} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Project" value={projectId} onChange={setProjectId} required options={projects.map((p) => ({ value: p.projectId, label: p.name }))} />
        <Select
          label="Team"
          value={teamId}
          onChange={(v) => {
            setTeamId(v);
            setAssigneeId("");
          }}
          required
          options={teams.map((t) => ({ value: t.teamId, label: t.name }))}
        />
        <Select
          label="Assignee"
          value={assigneeId}
          onChange={setAssigneeId}
          required
          options={users.filter((u) => u.role === "employee").map((u) => ({ value: u.userId, label: u.name }))}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(v) => setPriority(v as Priority)}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ]}
        />
        <Input label="Deadline" type="date" value={deadline} onChange={setDeadline} required />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create task"}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      >
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
