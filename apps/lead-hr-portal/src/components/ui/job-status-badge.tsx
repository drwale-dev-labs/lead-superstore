import type { JobStatus } from "@/lib/types";

const STYLES: Record<JobStatus, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-stone-200 text-stone-700" },
  published: { label: "Published", classes: "bg-green-100 text-green-800" },
  closed: { label: "Closed", classes: "bg-red-100 text-red-700" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classes}`}
    >
      {s.label}
    </span>
  );
}