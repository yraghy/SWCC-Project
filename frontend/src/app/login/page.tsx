"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, setDevUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDev(id: "ali" | "sara" | "omar") {
    try {
      await setDevUser(id);
      router.push("/dashboard");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-fg">Mini-Jira</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {USE_MOCKS && (
          <div className="mt-6 rounded-md border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Dev — quick login (mock mode)
            </p>
            <div className="flex flex-wrap gap-2">
              <DevButton onClick={() => handleDev("ali")}>Ali (Manager)</DevButton>
              <DevButton onClick={() => handleDev("sara")}>Sara (FE)</DevButton>
              <DevButton onClick={() => handleDev("omar")}>Omar (BE)</DevButton>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DevButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded border border-border px-2 py-1 text-xs hover:bg-muted">
      {children}
    </button>
  );
}
