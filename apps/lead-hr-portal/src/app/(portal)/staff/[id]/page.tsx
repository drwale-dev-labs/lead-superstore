"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Shield, AlertTriangle, Check } from "lucide-react";
import { fetchStaffById, activateStaff } from "@/lib/api/staff";
import {
  fetchReferences,
  fetchGuarantors,
  fetchVerificationStatus,
  getSignedUrl,
} from "@/lib/api/verification";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

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

  if (staffQuery.isLoading) return <LoadingState label="Loading staff…" />;
  if (staffQuery.isError) return <ErrorState message={staffQuery.error.message} />;
  if (!staffQuery.data) return <ErrorState message="Staff not found" />;

  const s = staffQuery.data;

  return (
    <div className="space-y-6">
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-3.5 w-3.5" />
        All employees
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">
              {s.first_name} {s.last_name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-stone-600">
              <span>{s.roles?.name ?? "—"}</span>
              <span className="text-stone-300">·</span>
              <span>{s.outlets?.name ?? "—"}</span>
              <StatusBadge status={s.status} />
            </div>
          </div>

          {s.status === "onboarding" && verifQuery.data && (
            <ActivateButton
              canActivate={verifQuery.data.can_activate}
              missing={verifQuery.data.missing}
              onActivate={() => activateMut.mutate()}
              pending={activateMut.isPending}
              error={activateMut.error?.message}
            />
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <Detail label="Phone" value={s.phone ?? "—"} />
          <Detail label="Email" value={s.email ?? "—"} />
          <Detail label="Hired" value={s.hired_at ?? "—"} />
          <Detail label="Verified" value={s.verified_at ? new Date(s.verified_at).toLocaleDateString() : "—"} />
        </dl>
      </header>

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
          </dl>
        ) : (
          <p className="text-xs text-stone-500">No bank details on file.</p>
        )}
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
                  <div className="text-sm font-medium text-stone-900">{r.full_name}</div>
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
                  <div className="text-sm font-medium text-stone-900">{g.full_name}</div>
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
      <dd className="text-sm text-stone-800">{value}</dd>
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
      className="text-xs text-amber-700 hover:underline"
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
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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