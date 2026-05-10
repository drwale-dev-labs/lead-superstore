import type { PayrollStatus } from "@/lib/types";

const STYLES: Record<PayrollStatus, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", classes: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", classes: "bg-green-100 text-green-800" },
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classes}`}
    >
      {s.label}
    </span>
  );
}