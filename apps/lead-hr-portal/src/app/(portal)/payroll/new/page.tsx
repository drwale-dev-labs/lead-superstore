"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Info } from "lucide-react";
import { fetchOutlets } from "@/lib/api/outlets";
import { createPeriod } from "@/lib/api/payroll";
import { ErrorState } from "@/components/ui/states";

export default function NewPeriodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });

  const [outletId, setOutletId] = useState<string>(
    searchParams.get("outlet_id") ?? "",
  );

  // Default to current calendar month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth);
  const [notes, setNotes] = useState("");

  // If no outlet was passed in, pick the first non-warehouse outlet
  useEffect(() => {
    if (!outletId && outletsQuery.data) {
      const first = outletsQuery.data.find((o) => !o.is_warehouse);
      if (first) setOutletId(first.id);
    }
  }, [outletId, outletsQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      createPeriod({
        outlet_id: outletId,
        period_start: periodStart,
        period_end: periodEnd,
        notes: notes || undefined,
      }),
    onSuccess: (period) => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      router.push(`/payroll/${period.id}`);
    },
  });

  const canSubmit =
    outletId && periodStart && periodEnd && periodEnd > periodStart && !mutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-stone-600">
        Create a draft payroll period for an outlet. Once created, you&apos;ll be able to
        generate entries automatically from active staff, edit if needed, then approve.
      </p>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <strong>How payroll works here:</strong> creating the period only sets up
            the container. Entries are generated next, snapshotting each active
            employee&apos;s salary, deductions, and bank details at that moment. You
            can edit any entry before approving.
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
          Period details
        </h2>

        <Field label="Outlet" required>
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            disabled={outletsQuery.isLoading}
            className={inputCls}
          >
            <option value="">
              {outletsQuery.isLoading ? "Loading…" : "Select outlet"}
            </option>
            {outletsQuery.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.is_warehouse ? " (Warehouse)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Period start" required>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>
          <Field label="Period end" required>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional — e.g. 'November payroll, includes festive bonus'"
            className={inputCls}
          />
        </Field>
      </div>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.push("/payroll")}
          className="rounded-md border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Creating…" : "Create period"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}