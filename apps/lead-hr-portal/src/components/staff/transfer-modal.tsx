"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ArrowRightLeft } from "lucide-react";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";
import { transferStaff, type TransferPayload } from "@/lib/api/transfers";
import { ErrorState } from "@/components/ui/states";
import type { Staff } from "@/lib/types";

type Props = {
  staff: Staff;
  open: boolean;
  onClose: () => void;
};

export function TransferModal({ staff, open, onClose }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => fetchRoles() });

  const [outletId, setOutletId] = useState<string>(staff.outlet_id ?? "");
  const [roleId, setRoleId] = useState<string>(staff.role_id ?? "");
  const [requireApproval, setRequireApproval] = useState(true);

  const mutation = useMutation({
    mutationFn: (payload: TransferPayload) => transferStaff(staff.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", staff.id] });
      qc.invalidateQueries({ queryKey: ["assignments", staff.id] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      onClose();
    },
  });

  if (!open) return null;

  const isNoOp = outletId === staff.outlet_id && roleId === staff.role_id;
  const selectedRole = rolesQuery.data?.find((r) => r.id === roleId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      new_outlet_id: outletId,
      new_role_id: roleId,
      effective_date: form.get("effective_date") as string,
      transfer_reason: form.get("transfer_reason") as string,
      approved_by_name: (form.get("approved_by_name") as string) || undefined,
      is_approved: !requireApproval || (form.get("is_approved") as string) === "on",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">
              Transfer {staff.first_name} {staff.last_name}
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
          <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-600">
            <div>
              <span className="font-medium">Currently:</span>{" "}
              {staff.roles?.name ?? "—"} at {staff.outlets?.name ?? "—"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New outlet" required>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                required
                disabled={outletsQuery.isLoading}
                className={inputCls}
              >
                <option value="">
                  {outletsQuery.isLoading ? "Loading…" : "Select outlet"}
                </option>
                {outletsQuery.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="New role" required>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                disabled={rolesQuery.isLoading}
                className={inputCls}
              >
                <option value="">
                  {rolesQuery.isLoading ? "Loading…" : "Select role"}
                </option>
                {rolesQuery.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.unit})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Effective date" required>
              <input
                name="effective_date"
                type="date"
                required
                defaultValue={today}
                className={inputCls}
              />
            </Field>

            <Field label="Approved by (name)">
              <input
                name="approved_by_name"
                placeholder="e.g. Tunde Bakare (Operations Manager)"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Reason for transfer" required>
            <textarea
              name="transfer_reason"
              required
              rows={3}
              minLength={3}
              placeholder="e.g. Promotion after 18 months as cashier; restructuring; performance reassignment…"
              className={inputCls}
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="is_approved"
              defaultChecked
              onChange={(e) => setRequireApproval(!e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-700"
            />
            <span>
              Mark as approved
              <span className="ml-1 text-xs text-stone-500">
                (uncheck to record as a draft transfer pending approval)
              </span>
            </span>
          </label>

          {selectedRole && roleId !== staff.role_id && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-medium">New role: </span>
              {selectedRole.name} — {selectedRole.unit} unit
            </div>
          )}

          {isNoOp && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              Pick a different outlet or role to transfer.
            </div>
          )}

          {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

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
              disabled={isNoOp || mutation.isPending}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {mutation.isPending ? "Transferring…" : "Confirm transfer"}
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