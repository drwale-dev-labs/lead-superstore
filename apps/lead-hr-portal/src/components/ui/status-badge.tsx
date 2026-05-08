import type { StaffStatus } from "@/lib/types";

const STATUS_STYLES: Record<StaffStatus, { label: string; classes: string }> = {
  onboarding: { label: "Onboarding", classes: "bg-amber-100 text-amber-800" },
  pending_verification: {
    label: "Pending verification",
    classes: "bg-orange-100 text-orange-800",
  },
  active: { label: "Active", classes: "bg-green-100 text-green-800" },
  inactive: { label: "Inactive", classes: "bg-stone-200 text-stone-700" },
  terminated: { label: "Terminated", classes: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: StaffStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style.classes}`}
    >
      {style.label}
    </span>
  );
}