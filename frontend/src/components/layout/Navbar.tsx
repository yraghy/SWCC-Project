"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, signOut } = useAuth();
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-base font-semibold text-fg">
          Mini-Jira
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user && (
            <>
              <span className="text-slate-600">
                {user.name} <span className="text-xs text-slate-400">· {user.role}</span>
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
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
