"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Comment } from "@shared/types";

export function CommentThread({ taskId }: { taskId: string }) {
  const { data, mutate, isLoading } = useSWR<Comment[]>(["comments", taskId].join("|"), () => api.listComments(taskId));
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await api.addComment(taskId, { body });
      setBody("");
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-fg">Comments</h3>
      {isLoading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : data && data.length > 0 ? (
        <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto">
          {data.map((c) => (
            <li key={c.commentId} className="rounded-md bg-muted p-2 text-sm">
              <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">{c.authorName ?? c.authorId}</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-fg">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-3 rounded-md border border-dashed border-border p-3 text-center text-xs text-slate-400">
          No comments yet.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
