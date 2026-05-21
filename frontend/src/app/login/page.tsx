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
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-border bg-white/80 p-7 shadow-card backdrop-blur-sm">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-lg shadow-lift" aria-hidden>
              🗂️
            </span>
            <h1 className="bg-brand-gradient bg-clip-text text-2xl font-bold text-transparent">Mini-Jira</h1>
          </div>
          <p className="text-sm text-slate-500">Welcome back — let&apos;s ship something today.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-gradient py-2 text-sm font-semibold text-white shadow-lift transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        {USE_MOCKS && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Dev — quick login (mock mode)
            </p>
            <div className="flex flex-wrap gap-2">
              <DevButton onClick={() => handleDev("ali")}>👔 Ali (Manager)</DevButton>
              <DevButton onClick={() => handleDev("sara")}>🎨 Sara (FE)</DevButton>
              <DevButton onClick={() => handleDev("omar")}>⚙️ Omar (BE)</DevButton>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DevButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft hover:text-accent"
    >
      {children}
    </button>
  );
}
