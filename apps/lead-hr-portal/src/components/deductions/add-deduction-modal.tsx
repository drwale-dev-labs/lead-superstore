"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Banknote, Receipt, AlertCircle } from "lucide-react";
import { fetchStaff } from "@/lib/api/staff";
import {
  createLoan,
  createAdvance,
  createFine,
} from "@/lib/api/deductions";
import { ErrorState } from "@/components/ui/states";

type DeductionType = "loan" | "advance" | "fine";

const TYPE_META = {
  loan: {
    title: "New loan",
    icon: Banknote,
    helper:
      "Capture the principal and monthly installment. Installments are pulled automatically each payroll period until the loan is paid off.",
  },
  advance: {
    title: "New salary advance",
    icon: Receipt,
    helper:
      "A one-off advance deducted from the next payroll period in full.",
  },
  fine: {
    title: "New fine",
    icon: AlertCircle,
    helper:
      "Fines start as 'pending' — they must be approved before they are included in the next payroll. The staff member should always be told why.",
  },
} as const;

type Props = {
  type: DeductionType;
  open: boolean;
  onClose: () => void;
};

export function AddDeductionModal({ type, open, onClose }: Props) {
  const qc = useQueryClient();
  const meta = TYPE_META[type];

  const staffQuery = useQuery({
    queryKey: ["staff", "active-and-onboarding"],
    queryFn: () => fetchStaff(),
    enabled: open,
  });

  const loanMut = useMutation({
    mutationFn: createLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      onClose();
    },
  });
  const advanceMut = useMutation({
    mutationFn: createAdvance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      onClose();
    },
  });
  const fineMut = useMutation({
    mutationFn: createFine,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fines"] });
      onClose();
    },
  });

  const activeMut = type === "loan" ? loanMut : type === "advance" ? advanceMut : fineMut;

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const staff_id = form.get("staff_id") as string;
    const amount = parseFloat(form.get("amount") as string);
    const reason = (form.get("reason") as string) || undefined;

    if (type === "loan") {
      loanMut.mutate({
        staff_id,
        principal: amount,
        monthly_installment: parseFloat(
          form.get("monthly_installment") as string,
        ),
        notes: reason,
      });
    } else if (type === "advance") {
      advanceMut.mutate({ staff_id, amount, reason });
    } else {
      fineMut.mutate({ staff_id, amount, reason: reason ?? "" });
    }
  }

  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">{meta.title}</h2>
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
          <p className="text-xs text-stone-600">{meta.helper}</p>

          <Field label="Employee" required>
            <select
              name="staff_id"
              required
              disabled={staffQuery.isLoading}
              className={inputCls}
            >
              <option value="">
                {staffQuery.isLoading ? "Loading…" : "Select employee"}
              </option>
              {staffQuery.data
                ?.filter((s) => s.status === "active" || s.status === "onboarding")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                    {s.roles?.name ? ` — ${s.roles.name}` : ""}
                  </option>
                ))}
            </select>
          </Field>

          {type === "loan" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Principal (₦)" required>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  className={inputCls}
                  placeholder="100000"
                />
              </Field>
              <Field label="Monthly installment (₦)" required>
                <input
                  name="monthly_installment"
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  className={inputCls}
                  placeholder="20000"
                />
              </Field>
            </div>
          ) : (
            <Field label="Amount (₦)" required>
              <input
                name="amount"
                type="number"
                step="0.01"
                min={1}
                required
                className={inputCls}
              />
            </Field>
          )}

          <Field
            label={type === "fine" ? "Reason" : "Reason (optional)"}
            required={type === "fine"}
          >
            <textarea
              name="reason"
              rows={3}
              required={type === "fine"}
              minLength={type === "fine" ? 3 : undefined}
              className={inputCls}
              placeholder={
                type === "loan"
                  ? "Personal loan, school fees, etc."
                  : type === "advance"
                    ? "Reason for the advance"
                    : "Tardiness, missed shift, breakage…"
              }
            />
          </Field>

          {activeMut.isError && (
            <ErrorState message={(activeMut.error as Error).message} />
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
              disabled={activeMut.isPending}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {activeMut.isPending ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
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