"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, X, History } from "lucide-react";
import {
  fetchSalaryStructures,
  createSalaryStructure,
} from "@/lib/api/salary";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { formatNaira } from "@/lib/types";


export function SalarySection({ staffId }: { staffId: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  const query = useQuery({
    queryKey: ["salary-structures", staffId],
    queryFn: () => fetchSalaryStructures(staffId),
  });

  if (query.isLoading) return <LoadingState label="Loading salary…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;

  const structures = query.data ?? [];
  // Current = the one with effective_to = null
  const current = structures.find((s) => s.effective_to === null);
  const history = structures.filter((s) => s.effective_to !== null);

  return (
    <>
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Wallet className="h-3.5 w-3.5" />
            Salary
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
          >
            <Plus className="h-3 w-3" />
            {current ? "Update salary" : "Set salary"}
          </button>
        </div>

        {current ? (
          <div className="rounded-md border border-amber-100 bg-amber-50/40 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  Current gross (monthly)
                </div>
                <div className="mt-1 text-2xl font-bold text-stone-900">
                  {formatNaira(Number(current.gross_salary))}
                </div>
              </div>
              <div className="text-right text-xs text-stone-500">
                Effective from {formatDate(current.effective_from)}
              </div>
            </div>
            {current.notes && (
              <p className="mt-3 border-t border-amber-100 pt-3 text-xs text-stone-600">
                {current.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
            <p className="text-sm text-stone-600">No salary set yet</p>
            <p className="mt-1 text-xs text-stone-500">
              This employee will be skipped at payroll generation until a salary is set.
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <h3 className="mb-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              <History className="h-3 w-3" />
              History
            </h3>
            <ul className="space-y-2 text-xs">
              {history.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-stone-50 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <span className="font-medium text-stone-700">
                      {formatNaira(Number(s.gross_salary))}
                    </span>
                    {s.notes && (
                      <span className="ml-2 text-stone-500">— {s.notes}</span>
                    )}
                  </div>
                  <div className="text-stone-500">
                    {formatDate(s.effective_from)} → {formatDate(s.effective_to!)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <SalaryModal
        staffId={staffId}
        currentSalary={current?.gross_salary ?? null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function SalaryModal({
  staffId,
  currentSalary,
  open,
  onClose,
}: {
  staffId: string;
  currentSalary: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const mutation = useMutation({
    mutationFn: createSalaryStructure,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-structures", staffId] });
      onClose();
    },
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      staff_id: staffId,
      gross_salary: parseFloat(form.get("gross_salary") as string),
      effective_from: form.get("effective_from") as string,
      notes: (form.get("notes") as string) || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">
              {currentSalary !== null ? "Update salary" : "Set salary"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {currentSalary !== null && (
            <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-600">
              Current salary:{" "}
              <span className="font-medium text-stone-800">
                {formatNaira(Number(currentSalary))}
              </span>
              . Setting a new one closes the current structure (effective the day
              before the new one starts) and opens this one.
            </div>
          )}

          <Field label="New gross salary (₦, monthly)" required>
            <input
              name="gross_salary"
              type="number"
              step="0.01"
              min={1}
              required
              defaultValue={currentSalary ?? ""}
              className={inputCls}
              placeholder="80000"
            />
          </Field>

          <Field label="Effective from" required>
            <input
              name="effective_from"
              type="date"
              required
              defaultValue={today}
              className={inputCls}
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. 'Promotion increase', 'Inflation adjustment'"
              className={inputCls}
            />
          </Field>

          {mutation.isError && (
            <ErrorState message={(mutation.error as Error).message} />
          )}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// // — error state extracted here only so the helper isn't redefined inside the modal —
// function ErrorState({ message }: { message: string }) {
//   return (
//     <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
//       {message}
//     </div>
//   );
// }

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}