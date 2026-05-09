import type { ApplicationStatus } from "@/lib/types";

const STYLES: Record<ApplicationStatus, { label: string; classes: string }> = {
  new: { label: "New", classes: "bg-blue-100 text-blue-800" },
  reviewing: { label: "Reviewing", classes: "bg-amber-100 text-amber-800" },
  shortlisted: { label: "Shortlisted", classes: "bg-purple-100 text-purple-800" },
  interviewed: { label: "Interviewed", classes: "bg-indigo-100 text-indigo-800" },
  hired: { label: "Hired", classes: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", classes: "bg-stone-200 text-stone-700" },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classes}`}
    >
      {s.label}
    </span>
  );
}