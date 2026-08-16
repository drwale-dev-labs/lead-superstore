"use client";

import { useQuery } from "@tanstack/react-query";
import { Receipt, Banknote, AlertCircle, GraduationCap, History } from "lucide-react";
import { fetchEntryDeductions, fetchEntryBondItems, fetchEntryCatchUps } from "@/lib/api/payroll";
import { LoadingState } from "@/components/ui/states";
import { formatNaira } from "@/lib/types";

const SOURCE_META = {
  loan: { label: "Loan", icon: Banknote, color: "text-orange-700" },
  advance: { label: "Advance", icon: Receipt, color: "text-blue-700" },
  fine: { label: "Fine", icon: AlertCircle, color: "text-red-700" },
  training_bond: { label: "Training bond", icon: GraduationCap, color: "text-purple-700" },
} as const;

export function DeductionBreakdown({ entryId }: { entryId: string }) {
  const query = useQuery({
    queryKey: ["entry-deductions", entryId],
    queryFn: () => fetchEntryDeductions(entryId),
  });

  const bondQuery = useQuery({
    queryKey: ["entry-bond-items", entryId],
    queryFn: () => fetchEntryBondItems(entryId),
  });

  const catchUpsQuery = useQuery({
    queryKey: ["entry-catch-ups", entryId],
    queryFn: () => fetchEntryCatchUps(entryId),
  });

  const payback = bondQuery.data?.find((b) => b.direction === "payback");
  const catchUps = catchUpsQuery.data ?? [];

  if (query.isLoading) return <LoadingState label="Loading deductions…" />;
  if (query.isError) {
    return (
      <p className="text-xs text-red-600">{query.error.message}</p>
    );
  }
  if ((!query.data || query.data.length === 0) && !payback && catchUps.length === 0) {
    return (
      <p className="text-xs text-stone-500">
        No deductions applied for this entry.
      </p>
    );
  }

  const total = (query.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-2">
      {catchUps.map((c) => (
        <div
          key={c.id}
          className="flex items-start justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 p-3"
        >
          <div className="flex min-w-0 items-start gap-2">
            <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-blue-600">
                Backdated catch-up
              </div>
              <div className="text-sm text-black">
                {c.description ?? `${c.days_owed} days owed`}
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-green-700">
            + {formatNaira(Number(c.amount))}
          </div>
        </div>
      ))}
      {payback && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-purple-100 bg-purple-50 p-3">
          <div className="flex min-w-0 items-start gap-2">
            <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-700" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-purple-600">
                Training bond payback
              </div>
              <div className="text-sm text-black">
                Month {payback.month_number} of 12 — added to net pay
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-green-700">
            + {formatNaira(Number(payback.amount))}
          </div>
        </div>
      )}
      {(query.data ?? []).map((d) => {
        const meta = SOURCE_META[d.source_type];
        const Icon = meta.icon;
        return (
          <div
            key={d.id}
            className="flex items-start justify-between gap-3 rounded-md border border-stone-100 bg-stone-50 p-3"
          >
            <div className="flex min-w-0 items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.color}`} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  {meta.label}
                </div>
                <div className="text-sm text-black">
                  {d.description ?? "—"}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-red-700">
              − {formatNaira(Number(d.amount))}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-sm">
        <span className="font-medium text-stone-700">Total deductions</span>
        <span className="font-semibold text-red-700">
          − {formatNaira(total)}
        </span>
      </div>
    </div>
  );
}