"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Shield,
  AlertTriangle,
  Check,
  Pencil,
  UserX,
  X,
} from "lucide-react";
import {
  fetchStaffById,
  activateStaff,
  updateStaff,
  terminateStaff,
  type UpdateStaffPayload,
  type TrainingBondOutcome,
} from "@/lib/api/staff";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";
import {
  fetchReferences,
  fetchGuarantors,
  fetchVerificationStatus,
  getSignedUrl,
} from "@/lib/api/verification";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { ArrowRightLeft } from "lucide-react";
import { TransferModal } from "@/components/staff/transfer-modal";
import { AssignmentHistory } from "@/components/staff/assignment-history";
import { SalarySection } from "@/components/staff/salary-section";
import { ContractSection } from "@/components/staff/contract-section";
import type { Staff } from "@/lib/types";


export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [bondNotice, setBondNotice] = useState<TrainingBondOutcome>(null);

  const staffQuery = useQuery({
    queryKey: ["staff", id],
    queryFn: () => fetchStaffById(id),
  });

  const verifQuery = useQuery({
    queryKey: ["verification-status", id],
    queryFn: () => fetchVerificationStatus(id),
  });

  const refsQuery = useQuery({
    queryKey: ["references", id],
    queryFn: () => fetchReferences(id),
  });

  const guarsQuery = useQuery({
    queryKey: ["guarantors", id],
    queryFn: () => fetchGuarantors(id),
  });

  const activateMut = useMutation({
    mutationFn: () => activateStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", id] });
      qc.invalidateQueries({ queryKey: ["verification-status", id] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const editMut = useMutation({
    mutationFn: (payload: UpdateStaffPayload) => updateStaff(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", id] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      setEditOpen(false);
    },
  });

  const terminateMut = useMutation({
    mutationFn: () => terminateStaff(id),
    onSuccess: ({ training_bond }) => {
      qc.invalidateQueries({ queryKey: ["staff", id] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      setTerminateOpen(false);
      if (training_bond) {
        setBondNotice(training_bond);
      } else {
        router.push(`/staff/${id}`);
      }
    },
  });

  if (staffQuery.isLoading) return <LoadingState label="Loading staff…" />;
  if (staffQuery.isError) return <ErrorState message={staffQuery.error.message} />;
  if (!staffQuery.data) return <ErrorState message="Staff not found" />;

  const s = staffQuery.data;

  return (
    <div className="space-y-6">
      <TransferModal staff={s} open={transferOpen} onClose={() => setTransferOpen(false)} />
      {editOpen && (
        <EditStaffModal
          staff={s}
          onClose={() => setEditOpen(false)}
          onSubmit={(payload) => editMut.mutate(payload)}
          pending={editMut.isPending}
          error={editMut.isError ? (editMut.error as Error).message : null}
        />
      )}
      {terminateOpen && (
        <TerminateModal
          staff={s}
          onClose={() => setTerminateOpen(false)}
          onConfirm={() => terminateMut.mutate()}
          pending={terminateMut.isPending}
          error={terminateMut.isError ? (terminateMut.error as Error).message : null}
        />
      )}
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-black">
        <ArrowLeft className="h-3.5 w-3.5" />
        All employees
      </Link>

      {bondNotice && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {bondNotice.outcome === "forfeited" ? (
            <>
              <strong>Training bond forfeited.</strong> This staff member left within the
              first 6 months. ₦{bondNotice.amount_forfeited?.toLocaleString()} already
              deducted is forfeited — no further action needed.
            </>
          ) : (
            <>
              <strong>Training bond needs review.</strong> This staff member left during
              the payback phase with an outstanding balance of ₦
              {bondNotice.outstanding_balance?.toLocaleString()}. Decide manually whether
              to pay this out — it will not be paid automatically.
            </>
          )}
          <button
            onClick={() => setBondNotice(null)}
            className="ml-3 text-orange-700 underline hover:text-orange-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-5">
            <Avatar
              staffId={s.id}
              hasPhoto={!!s.photo_path}
              firstName={s.first_name}
              lastName={s.last_name}
              size="xl"
            />
            <div>
              <h1 className="text-xl font-semibold text-black">
                {s.first_name} {s.last_name}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-stone-600">
                <span>{s.roles?.name ?? "—"}</span>
                <span className="text-stone-300">·</span>
                <span>{s.outlets?.name ?? "—"}</span>
                <StatusBadge status={s.status} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {s.status === "onboarding" && verifQuery.data && (
              <ActivateButton
                canActivate={verifQuery.data.can_activate}
                missing={verifQuery.data.missing}
                onActivate={() => activateMut.mutate()}
                pending={activateMut.isPending}
                error={activateMut.error?.message}
              />
            )}
            <div className="flex items-center gap-2">
              {s.status === "active" && (
                <button
                  onClick={() => setTransferOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer
                </button>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              {s.status !== "terminated" && (
                <button
                  onClick={() => setTerminateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4" />
                  Terminate
                </button>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <Detail label="Phone" value={s.phone ?? "—"} />
          <Detail label="Email" value={s.email ?? "—"} />
          <Detail label="Hired" value={s.hired_at ?? "—"} />
          <Detail
            label="Verified"
            value={s.verified_at ? new Date(s.verified_at).toLocaleDateString() : "—"}
          />
        </dl>
      </header>

      {/* Salary */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Salary
        </h2>
        <SalarySection staffId={s.id} />
      </section>

      {/* Bank */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Bank details
        </h2>
        {s.bank_name || s.bank_account_number ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
            <Detail label="Bank" value={s.bank_name ?? "—"} />
            <Detail label="Account number" value={s.bank_account_number ?? "—"} />
            <Detail label="Account name" value={s.bank_account_name ?? "—"} />
            <Detail label="Sort code" value={s.bank_sort_code ?? "—"} />
          </dl>
        ) : (
          <p className="text-xs text-stone-500">No bank details on file.</p>
        )}
      </section>

      {/* Contract */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <FileText className="h-3.5 w-3.5" />
          Employment contract
        </h2>
        {s.status === "active" ? (
          <ContractSection staffId={s.id} />
        ) : (
          <p className="text-xs text-stone-500">
            Contracts can only be generated for active staff.
          </p>
        )}
      </section>

      {/* Assignment history */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Assignment history
        </h2>
        <AssignmentHistory staffId={s.id} />
      </section>

      {/* References */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <FileText className="h-3.5 w-3.5" />
          References ({refsQuery.data?.length ?? 0})
        </h2>
        {refsQuery.data?.length === 0 && (
          <p className="text-xs text-stone-500">No references recorded yet.</p>
        )}
        <div className="space-y-3">
          {refsQuery.data?.map((r) => (
            <div key={r.id} className="rounded-md border border-stone-100 bg-stone-50 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-black">{r.full_name}</div>
                  <div className="text-xs text-stone-500">
                    {r.reference_type.replace("_", " ")} · {r.relationship}
                  </div>
                  <div className="mt-1 text-xs text-stone-600">{r.phone}</div>
                </div>
                {r.document_path && (
                  <DocumentLink path={r.document_path} filename={r.document_filename} />
                )}
              </div>
              {r.note && <p className="mt-2 text-xs text-stone-600">{r.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Guarantors */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <Shield className="h-3.5 w-3.5" />
          Guarantors ({guarsQuery.data?.length ?? 0})
        </h2>
        {guarsQuery.data?.length === 0 && (
          <p className="text-xs text-stone-500">No guarantors recorded yet.</p>
        )}
        <div className="space-y-3">
          {guarsQuery.data?.map((g) => (
            <div key={g.id} className="rounded-md border border-stone-100 bg-stone-50 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-black">{g.full_name}</div>
                  <div className="text-xs text-stone-500">
                    {g.occupation} · {g.relationship}
                  </div>
                  <div className="mt-1 text-xs text-stone-600">
                    {g.phone}
                    {g.id_type && ` · ${g.id_type}: ${g.id_number}`}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">{g.address}</div>
                </div>
                {g.document_path && (
                  <DocumentLink path={g.document_path} filename={g.document_filename} />
                )}
              </div>
              {g.note && <p className="mt-2 text-xs text-stone-600">{g.note}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-stone-400">{label}</dt>
      <dd className="text-sm text-black">{value}</dd>
    </div>
  );
}

function DocumentLink({
  path,
  filename,
}: {
  path: string;
  filename: string | null;
}) {
  async function open() {
    try {
      const url = await getSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(`Could not open document: ${(e as Error).message}`);
    }
  }
  return (
    <button
      onClick={open}
      className="text-xs text-orange-700 hover:underline"
      title={filename ?? undefined}
    >
      View document
    </button>
  );
}

function ActivateButton({
  canActivate,
  missing,
  onActivate,
  pending,
  error,
}: {
  canActivate: boolean;
  missing: string[];
  onActivate: () => void;
  pending: boolean;
  error?: string;
}) {
  if (!canActivate) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Cannot activate</div>
          <div>Missing: {missing.join(", ")}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onActivate}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {pending ? "Activating…" : "Activate employee"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function EditStaffModal({
  staff,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  staff: Staff;
  onClose: () => void;
  onSubmit: (payload: UpdateStaffPayload) => void;
  pending: boolean;
  error: string | null;
}) {
  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => fetchRoles() });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      outlet_id: (form.get("outlet_id") as string) || undefined,
      role_id: (form.get("role_id") as string) || undefined,
      hired_at: (form.get("hired_at") as string) || undefined,
      bank_name: (form.get("bank_name") as string) || null,
      bank_account_number: (form.get("bank_account_number") as string) || null,
      bank_account_name: (form.get("bank_account_name") as string) || null,
      bank_sort_code: (form.get("bank_sort_code") as string) || null,
      notes: (form.get("notes") as string) || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-semibold text-black">Edit staff record</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField label="First name" required>
              <input
                name="first_name"
                required
                defaultValue={staff.first_name}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Last name" required>
              <input
                name="last_name"
                required
                defaultValue={staff.last_name}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Email">
              <input
                name="email"
                type="email"
                defaultValue={staff.email ?? ""}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Phone">
              <input name="phone" defaultValue={staff.phone ?? ""} className={modalInputCls} />
            </ModalField>
            <ModalField label="Outlet">
              <select
                name="outlet_id"
                defaultValue={staff.outlet_id ?? ""}
                disabled={outletsQuery.isLoading}
                className={modalInputCls}
              >
                {outletsQuery.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Role">
              <select
                name="role_id"
                defaultValue={staff.role_id ?? ""}
                disabled={rolesQuery.isLoading}
                className={modalInputCls}
              >
                {rolesQuery.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.unit})
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Hire date">
              <input
                name="hired_at"
                type="date"
                defaultValue={staff.hired_at ?? ""}
                className={modalInputCls}
              />
            </ModalField>
          </div>

          <h3 className="border-b border-stone-100 pb-2 text-sm font-semibold text-black">
            Bank details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModalField label="Bank name">
              <input
                name="bank_name"
                defaultValue={staff.bank_name ?? ""}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Account number">
              <input
                name="bank_account_number"
                maxLength={10}
                defaultValue={staff.bank_account_number ?? ""}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Account name">
              <input
                name="bank_account_name"
                defaultValue={staff.bank_account_name ?? ""}
                className={modalInputCls}
              />
            </ModalField>
            <ModalField label="Sort code">
              <input
                name="bank_sort_code"
                maxLength={20}
                defaultValue={staff.bank_sort_code ?? ""}
                className={modalInputCls}
              />
            </ModalField>
          </div>

          <ModalField label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={staff.notes ?? ""}
              className={modalInputCls}
            />
          </ModalField>

          {error && <p className="text-xs text-red-600">{error}</p>}

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
              disabled={pending}
              className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TerminateModal({
  staff,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  staff: Staff;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-semibold text-black">Terminate employee</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              This sets <strong>{staff.first_name} {staff.last_name}</strong>&apos;s status to
              &quot;terminated&quot; with today&apos;s date. Their payroll history is preserved
              — this is not a deletion and cannot be easily undone.
            </p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              onClick={onClose}
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={pending}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {pending ? "Terminating…" : "Confirm termination"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const modalInputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none";

function ModalField({
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