"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Receipt,
  AlertCircle,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  fetchLoans,
  fetchAdvances,
  fetchFines,
  approveFine,
  updateLoan,
  updateAdvance,
  updateFine,
} from "@/lib/api/deductions";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { AddDeductionModal } from "@/components/deductions/add-deduction-modal";
import { formatNaira } from "@/lib/types";
import type { Loan, Advance, Fine } from "@/lib/types";

type Tab = "loans" | "advances" | "fines";

const TABS: { value: Tab; label: string; icon: typeof Banknote }[] = [
  { value: "loans", label: "Loans", icon: Banknote },
  { value: "advances", label: "Salary advances", icon: Receipt },
  { value: "fines", label: "Fines", icon: AlertCircle },
];

export default function DeductionsPage() {
  const [tab, setTab] = useState<Tab>("loans");
  const [modalOpen, setModalOpen] = useState(false);

  const loansQuery = useQuery({
    queryKey: ["loans"],
    queryFn: () => fetchLoans(),
    enabled: tab === "loans",
  });
  const advancesQuery = useQuery({
    queryKey: ["advances"],
    queryFn: () => fetchAdvances(),
    enabled: tab === "advances",
  });
  const finesQuery = useQuery({
    queryKey: ["fines"],
    queryFn: () => fetchFines(),
    enabled: tab === "fines",
  });

  const modalType = tab === "loans" ? "loan" : tab === "advances" ? "advance" : "fine";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          Manage loans, salary advances, and fines. All three are pulled into payroll
          automatically at generation time — loans deduct their monthly installment,
          advances deduct in full, fines deduct in full but only after admin approval.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          <Plus className="h-4 w-4" />
          New {modalType}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-amber-700 text-amber-700"
                  : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {tab === "loans" && (
        <LoansList query={loansQuery} />
      )}
      {tab === "advances" && (
        <AdvancesList query={advancesQuery} />
      )}
      {tab === "fines" && (
        <FinesList query={finesQuery} />
      )}

      <AddDeductionModal
        type={modalType}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Loans
// ============================================================================

function LoansList({ query }: { query: ReturnType<typeof useQuery<Loan[]>> }) {
  const qc = useQueryClient();
  const cancelMut = useMutation({
    mutationFn: (id: string) => updateLoan(id, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });

  if (query.isLoading) return <LoadingState label="Loading loans…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data || query.data.length === 0) {
    return (
      <EmptyState
        title="No loans recorded"
        description="Click 'New loan' to record one. The monthly installment is pulled at every payroll generation until the loan is paid off."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Employee</th>
            <th className="px-4 py-3 text-right font-medium">Principal</th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
            <th className="px-4 py-3 text-right font-medium">Installment</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {query.data.map((l) => (
            <tr key={l.id} className="hover:bg-stone-50">
              <td className="px-4 py-3">
                <div className="font-medium text-stone-900">
                  {l.staff?.first_name} {l.staff?.last_name}
                </div>
                {l.reason && (
                  <div className="mt-0.5 text-xs text-stone-500">{l.reason}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right text-stone-700">
                {formatNaira(Number(l.principal))}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={
                    Number(l.balance) === 0
                      ? "text-stone-400"
                      : "font-semibold text-stone-900"
                  }
                >
                  {formatNaira(Number(l.balance))}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-stone-700">
                {formatNaira(Number(l.monthly_installment))}
              </td>
              <td className="px-4 py-3">
                <LoanStatusBadge status={l.status} />
              </td>
              <td className="px-4 py-3 text-right">
                {l.status === "active" && (
                  <button
                    onClick={() => {
                      if (confirm(`Cancel loan for ${l.staff?.first_name}?`)) {
                        cancelMut.mutate(l.id);
                      }
                    }}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoanStatusBadge({ status }: { status: Loan["status"] }) {
  const styles = {
    active: "bg-amber-100 text-amber-800",
    paid_off: "bg-green-100 text-green-800",
    cancelled: "bg-stone-200 text-stone-700",
  };
  const labels = {
    active: "Active",
    paid_off: "Paid off",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ============================================================================
// Advances
// ============================================================================

function AdvancesList({
  query,
}: {
  query: ReturnType<typeof useQuery<Advance[]>>;
}) {
  const qc = useQueryClient();
  const cancelMut = useMutation({
    mutationFn: (id: string) => updateAdvance(id, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advances"] }),
  });

  if (query.isLoading) return <LoadingState label="Loading advances…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data || query.data.length === 0) {
    return (
      <EmptyState
        title="No advances recorded"
        description="Advances are one-off deductions taken from the next payroll period in full."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Employee</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Reason</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {query.data.map((a) => (
            <tr key={a.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 font-medium text-stone-900">
                {a.staff?.first_name} {a.staff?.last_name}
              </td>
              <td className="px-4 py-3 text-right text-stone-700">
                {formatNaira(Number(a.amount))}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">{a.reason ?? "—"}</td>
              <td className="px-4 py-3">
                <AdvanceStatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 text-right">
                {a.status === "pending" && (
                  <button
                    onClick={() => {
                      if (confirm(`Cancel advance for ${a.staff?.first_name}?`)) {
                        cancelMut.mutate(a.id);
                      }
                    }}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdvanceStatusBadge({ status }: { status: Advance["status"] }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    applied: "bg-green-100 text-green-800",
    cancelled: "bg-stone-200 text-stone-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ============================================================================
// Fines
// ============================================================================

function FinesList({ query }: { query: ReturnType<typeof useQuery<Fine[]>> }) {
  const qc = useQueryClient();
  const approveMut = useMutation({
    mutationFn: (id: string) => approveFine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fines"] }),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => updateFine(id, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fines"] }),
  });

  if (query.isLoading) return <LoadingState label="Loading fines…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data || query.data.length === 0) {
    return (
      <EmptyState
        title="No fines recorded"
        description="Fines start as 'pending' — approve them to include in the next payroll."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Employee</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Reason</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {query.data.map((f) => (
            <tr key={f.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 font-medium text-stone-900">
                {f.staff?.first_name} {f.staff?.last_name}
              </td>
              <td className="px-4 py-3 text-right text-stone-700">
                {formatNaira(Number(f.amount))}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">{f.reason}</td>
              <td className="px-4 py-3">
                <FineStatusBadge status={f.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {f.status === "pending" && (
                    <>
                      <button
                        onClick={() => approveMut.mutate(f.id)}
                        disabled={approveMut.isPending}
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Cancel fine for ${f.staff?.first_name}?`)) {
                            cancelMut.mutate(f.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FineStatusBadge({ status }: { status: Fine["status"] }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    cancelled: "bg-stone-200 text-stone-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}