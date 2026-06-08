"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Wallet,
  Calendar,
  Calculator,
  Receipt,
  Lock,
} from "lucide-react";
import {
  fetchPeriodDetail,
  updateEntry,
} from "@/lib/api/payroll";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { DeductionBreakdown } from "@/components/payroll/deduction-breakdown";
import { formatNaira } from "@/lib/types";

export default function EntryEditPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = use(params);
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["period", id],
    queryFn: () => fetchPeriodDetail(id),
  });

  const entry = detailQuery.data?.entries.find((e) => e.id === entryId);
  const period = detailQuery.data?.period;
  const isLocked = period?.status !== "draft";

  // Form state — initialised from entry once it loads
  const [grossSalary, setGrossSalary] = useState<string>("");
  const [workingDays, setWorkingDays] = useState<string>("");
  const [deductions, setDeductions] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (entry && !hydrated) {
      setGrossSalary(String(entry.gross_salary));
      setWorkingDays(String(entry.working_days));
      setDeductions(String(entry.deductions));
      setNotes(entry.notes ?? "");
      setHydrated(true);
    }
  }, [entry, hydrated]);

  // Live preview of net pay
  const previewNet = (() => {
    const g = parseFloat(grossSalary) || 0;
    const d = parseFloat(deductions) || 0;
    const days = parseFloat(workingDays) || 0;
    if (days <= 0 || days > 30) return null;
    return (days / 30) * g - d;
  })();

  const mutation = useMutation({
    mutationFn: () =>
      updateEntry(entryId, {
        gross_salary: parseFloat(grossSalary),
        working_days: parseInt(workingDays, 10),
        deductions: parseFloat(deductions),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period", id] });
      qc.invalidateQueries({ queryKey: ["periods"] });
    },
  });

  if (detailQuery.isLoading) return <LoadingState label="Loading entry…" />;
  if (detailQuery.isError) return <ErrorState message={detailQuery.error.message} />;
  if (!entry || !period) return <ErrorState message="Entry not found" />;

  const isDirty =
    parseFloat(grossSalary) !== Number(entry.gross_salary) ||
    parseInt(workingDays, 10) !== entry.working_days ||
    parseFloat(deductions) !== Number(entry.deductions) ||
    (notes || null) !== entry.notes;

  return (
    <div className="space-y-6">
      <Link
        href={`/payroll/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to period
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">
              {entry.staff?.first_name} {entry.staff?.last_name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-stone-600">
              <span>{entry.staff?.roles?.name ?? "—"}</span>
              <span className="text-stone-300">·</span>
              <span>{period.outlets?.name ?? "—"}</span>
              <span className="text-stone-300">·</span>
              <span>{formatPeriod(period.period_start, period.period_end)}</span>
            </div>
          </div>
          {isLocked && (
            <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </div>
          )}
        </div>

        {/* Bank snapshot */}
        {(entry.bank_name || entry.bank_account_number) && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-stone-100 pt-4 sm:grid-cols-3 text-xs">
            <Item label="Bank" value={entry.bank_name ?? "—"} />
            <Item
              label="Account number"
              value={entry.bank_account_number ?? "—"}
            />
            <Item
              label="Account name"
              value={entry.bank_account_name ?? "—"}
            />
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2 rounded-lg border border-stone-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
            Edit entry
          </h2>

          {isLocked && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              This period has been approved. Entries are locked and read-only.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Gross salary (₦)"
              icon={Wallet}
              hint="Pulled from the active salary structure at generation time"
            >
              <input
                type="number"
                step="0.01"
                min={0}
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
                disabled={isLocked}
                className={inputCls}
              />
            </Field>
            <Field
              label="Working days"
              icon={Calendar}
              hint="Out of 30 — adjust for partial-month staff"
            >
              <input
                type="number"
                min={0}
                max={30}
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                disabled={isLocked}
                className={inputCls}
              />
            </Field>
            <Field
              label="Total deductions (₦)"
              icon={Receipt}
              hint="Sum of all loan/advance/fine items, plus any manual override"
            >
              <input
                type="number"
                step="0.01"
                min={0}
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                disabled={isLocked}
                className={inputCls}
              />
            </Field>
            <Field label="Computed net pay" icon={Calculator}>
              <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900">
                {previewNet !== null ? formatNaira(previewNet) : "—"}
              </div>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked}
              rows={3}
              placeholder="Optional — explain any manual adjustments to gross, working days, or deductions"
              className={inputCls}
            />
          </Field>

          {mutation.isError && (
            <ErrorState message={(mutation.error as Error).message} />
          )}

          {!isLocked && (
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <Link
                href={`/payroll/${id}`}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Link>
              <button
                onClick={() => mutation.mutate()}
                disabled={!isDirty || mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {mutation.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          {/* Mutation hint about regeneration */}
          {!isLocked && (
            <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3 text-[11px] text-amber-800">
              <strong>Heads up:</strong> manual edits are preserved unless you
              regenerate the whole period. If you regenerate, this entry will be rebuilt
              from the current salary structure and pending deductions.
            </div>
          )}
        </div>

        {/* Deduction breakdown sidebar */}
        <aside className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Deduction breakdown
          </h2>
          <DeductionBreakdown entryId={entryId} />
        </aside>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none disabled:bg-stone-50 disabled:text-stone-500";

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon?: typeof Wallet;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-stone-600">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-stone-500">{hint}</span>}
    </label>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-400">{label}</div>
      <div className="text-stone-700">{value}</div>
    </div>
  );
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return s.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  }
  return `${s.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}`;
}