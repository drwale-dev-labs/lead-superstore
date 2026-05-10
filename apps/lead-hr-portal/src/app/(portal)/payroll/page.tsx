"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, Wallet } from "lucide-react";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchPeriods } from "@/lib/api/payroll";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { PayrollStatusBadge } from "@/components/ui/payroll-status-badge";
import { formatNaira } from "@/lib/types";
import type { PayrollStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: PayrollStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
];

export default function PayrollPage() {
  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const [outletId, setOutletId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | "all">("all");

  // Auto-select the first non-warehouse outlet when loaded
  const firstOutletId = outletsQuery.data?.find((o) => !o.is_warehouse)?.id;
  const effectiveOutletId = outletId || firstOutletId || "";

  const periodsQuery = useQuery({
    queryKey: ["periods", effectiveOutletId, statusFilter],
    queryFn: () =>
      fetchPeriods({
        outlet_id: effectiveOutletId || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: !!effectiveOutletId,
  });

  const totals = useMemo(() => {
    if (!periodsQuery.data) return null;
    return {
      count: periodsQuery.data.length,
      gross: periodsQuery.data.reduce((sum, p) => sum + Number(p.total_gross), 0),
      net: periodsQuery.data.reduce((sum, p) => sum + Number(p.total_net), 0),
    };
  }, [periodsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          Run payroll per outlet. Each month creates a new period — generate entries from
          active staff, edit if needed, then approve to lock and commit deductions.
        </p>
        {effectiveOutletId && (
          <Link
            href={`/payroll/new?outlet_id=${effectiveOutletId}`}
            className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            <Plus className="h-4 w-4" />
            New period
          </Link>
        )}
      </div>

      {/* Outlet selector */}
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Outlet
            </label>
            <select
              value={effectiveOutletId}
              onChange={(e) => setOutletId(e.target.value)}
              disabled={outletsQuery.isLoading}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
            >
              {outletsQuery.isLoading && <option>Loading…</option>}
              {outletsQuery.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.is_warehouse ? " (Warehouse)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PayrollStatus | "all")
              }
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {totals && (
            <div className="ml-auto text-xs text-stone-500">
              <div>
                <span className="font-medium text-stone-700">{totals.count}</span> periods
              </div>
              <div>
                Total net:{" "}
                <span className="font-medium text-stone-700">
                  {formatNaira(totals.net)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Periods */}
      {periodsQuery.isLoading && <LoadingState label="Loading periods…" />}
      {periodsQuery.isError && <ErrorState message={periodsQuery.error.message} />}
      {periodsQuery.data && periodsQuery.data.length === 0 && (
        <EmptyState
          title="No payroll periods yet"
          description={`No payroll has been run for this outlet. Click "New period" to start.`}
        />
      )}

      {periodsQuery.data && periodsQuery.data.length > 0 && (
        <div className="space-y-3">
          {periodsQuery.data.map((p) => (
            <Link
              key={p.id}
              href={`/payroll/${p.id}`}
              className="block rounded-lg border border-stone-200 bg-white p-5 transition-colors hover:border-amber-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatPeriodLabel(p.period_start, p.period_end)}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-stone-900">
                    {p.outlets?.name ?? "—"}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      Gross {formatNaira(Number(p.total_gross))}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span>Net {formatNaira(Number(p.total_net))}</span>
                    {p.approved_at && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span>
                          Approved {new Date(p.approved_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <PayrollStatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return s.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  }
  return `${s.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}`;
}