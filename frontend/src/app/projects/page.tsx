import { Suspense } from "react";
import { ProjectPageClient } from "./ProjectPageClient";

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <ProjectPageClient />
    </Suspense>
  );
}
