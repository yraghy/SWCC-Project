"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="group flex items-center gap-2 text-base font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-gradient animate-pulse-dot" aria-hidden />
          <span className="bg-brand-gradient bg-clip-text text-transparent transition-transform group-hover:scale-105">
            Mini-Jira
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user && (
            <>
              <span className="hidden text-slate-600 sm:inline">
                Hey, <span className="font-medium text-fg">{user.name.split(" ")[0]}</span> 👋
              </span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                {user.role}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
