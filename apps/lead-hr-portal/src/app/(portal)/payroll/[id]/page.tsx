"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  PlayCircle,
  CheckCircle2,
  Building2,
  Wallet,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  fetchPeriodDetail,
  generateEntries,
  approvePeriod,
} from "@/lib/api/payroll";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { PayrollStatusBadge } from "@/components/ui/payroll-status-badge";
import { formatNaira } from "@/lib/types";

export default function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["period", id],
    queryFn: () => fetchPeriodDetail(id),
  });

  const generateMut = useMutation({
    mutationFn: () => generateEntries(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period", id] });
      qc.invalidateQueries({ queryKey: ["periods"] });
    },
  });

  const approveMut = useMutation({
    mutationFn: () => approvePeriod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period", id] });
      qc.invalidateQueries({ queryKey: ["periods"] });
    },
  });

  if (detailQuery.isLoading) return <LoadingState label="Loading payroll period…" />;
  if (detailQuery.isError) return <ErrorState message={detailQuery.error.message} />;
  if (!detailQuery.data) return <ErrorState message="Period not found" />;

  const { period, entries } = detailQuery.data;
  const isDraft = period.status === "draft";
  const hasEntries = entries.length > 0;
  const canApprove = isDraft && hasEntries;

  return (
    <div className="space-y-6">
      <Link
        href="/payroll"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All payroll periods
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
              <Calendar className="h-3.5 w-3.5" />
              {formatPeriodLabel(period.period_start, period.period_end)}
            </div>
            <h1 className="mt-1 text-xl font-semibold text-stone-900">
              {period.outlets?.name ?? "—"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {period.outlets?.name ?? "—"}
              </span>
              {period.approved_at && (
                <>
                  <span className="text-stone-300">·</span>
                  <span>
                    Approved {new Date(period.approved_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
            {period.notes && (
              <p className="mt-3 text-sm text-stone-600">{period.notes}</p>
            )}
          </div>
          <PayrollStatusBadge status={period.status} />
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-stone-100 pt-4 text-sm">
          <Stat
            icon={Users}
            label="Entries"
            value={entries.length.toString()}
          />
          <Stat
            icon={Wallet}
            label="Total gross"
            value={formatNaira(Number(period.total_gross))}
          />
          <Stat
            icon={Wallet}
            label="Total net"
            value={formatNaira(Number(period.total_net))}
            emphasised
          />
        </div>
      </header>

      {/* Action bar */}
      {isDraft && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-amber-900">
                {hasEntries
                  ? "Review entries, then approve"
                  : "Generate entries to begin"}
              </div>
              <p className="mt-1 text-xs text-amber-800">
                {hasEntries
                  ? "Edit individual entries below if needed. Approving locks the period and commits loan repayments."
                  : "This pulls every active employee at this outlet, snapshots their salary, applies pending loan installments, advances, and approved fines, and computes net pay."}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => {
                  if (
                    hasEntries &&
                    !confirm(
                      "Regenerate will discard the current entries and rebuild them from scratch. Continue?",
                    )
                  ) {
                    return;
                  }
                  generateMut.mutate();
                }}
                disabled={generateMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {generateMut.isPending
                  ? "Generating…"
                  : hasEntries
                    ? "Regenerate"
                    : "Generate entries"}
              </button>
              {canApprove && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Approve this period? This locks the entries and commits loan repayments. This action cannot be undone.",
                      )
                    ) {
                      approveMut.mutate();
                    }
                  }}
                  disabled={approveMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {approveMut.isPending ? "Approving…" : "Approve & lock"}
                </button>
              )}
            </div>
          </div>

          {generateMut.isError && (
            <div className="mt-3 rounded-md border border-red-200 bg-white p-3 text-xs text-red-700">
              {(generateMut.error as Error).message}
            </div>
          )}
          {approveMut.isError && (
            <div className="mt-3 rounded-md border border-red-200 bg-white p-3 text-xs text-red-700">
              {(approveMut.error as Error).message}
            </div>
          )}
        </div>
      )}

      {/* Skipped staff (after generate) */}
      {generateMut.data && generateMut.data.skipped.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-700" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-orange-900">
                {generateMut.data.skipped.length} staff skipped
              </div>
              <p className="mt-1 text-xs text-orange-800">
                These staff are active but have no salary structure on file. Set a
                salary from their profile, then regenerate.
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-orange-700">
                {generateMut.data.skipped.map((name, idx) => (
                  <li key={idx}>• {name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Entries table */}
      {!hasEntries ? (
        <EmptyState
          title="No entries yet"
          description={
            isDraft
              ? "Click 'Generate entries' above to create entries from active staff."
              : "This period has no entries."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 text-right font-medium">Days</th>
                <th className="px-4 py-3 text-right font-medium">Deductions</th>
                <th className="px-4 py-3 text-right font-medium">Net pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={
                        isDraft
                          ? `/payroll/${id}/entries/${entry.id}`
                          : `/staff/${entry.staff_id}`
                      }
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {entry.staff?.first_name} {entry.staff?.last_name}
                    </Link>
                    {entry.staff?.roles?.name && (
                      <div className="text-xs text-stone-500">
                        {entry.staff.roles.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {formatNaira(Number(entry.gross_salary))}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {entry.working_days}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {Number(entry.deductions) > 0 ? (
                      <span className="text-red-700">
                        − {formatNaira(Number(entry.deductions))}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-stone-900">
                      {formatNaira(Number(entry.net_pay))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-stone-200 bg-stone-50 text-xs">
              <tr>
                <td className="px-4 py-3 font-semibold text-stone-700">Total</td>
                <td className="px-4 py-3 text-right text-stone-700">
                  {formatNaira(Number(period.total_gross))}
                </td>
                <td />
                <td className="px-4 py-3 text-right text-red-700">
                  {Number(period.total_gross) - Number(period.total_net) > 0
                    ? `− ${formatNaira(Number(period.total_gross) - Number(period.total_net))}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-bold text-stone-900">
                  {formatNaira(Number(period.total_net))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer hint for approved periods */}
      {!isDraft && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
          This period is locked. Click an employee row to view their staff profile.
          Loan balances were decremented when this period was approved.
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  emphasised = false,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  emphasised?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={`mt-1 ${emphasised ? "text-base font-semibold text-stone-900" : "text-sm text-stone-700"}`}
      >
        {value}
      </div>
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