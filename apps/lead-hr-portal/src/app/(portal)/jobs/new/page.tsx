"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, Wand2 } from "lucide-react";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";
import { createJob, generateJobAd } from "@/lib/api/jobs";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ListEditor } from "@/components/ui/list-editor";

export default function NewJobPage() {
  const router = useRouter();

  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => fetchRoles() });

  const [roleId, setRoleId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [closesAt, setClosesAt] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);

  // Auto-generate title when role + outlet are picked
  function handleRoleChange(id: string) {
    setRoleId(id);
    autofillTitle(id, outletId);
    // Pre-populate requirements from the role definition
    const role = rolesQuery.data?.find((r) => r.id === id);
    if (role?.requirements && requirements.length === 0) {
      setRequirements(role.requirements);
    }
  }
 
  function handleOutletChange(id: string) {
    setOutletId(id);
    autofillTitle(roleId, id);
  }
  function autofillTitle(rId: string, oId: string) {
    if (!rId || !oId) return;
    const role = rolesQuery.data?.find((r) => r.id === rId);
    const outlet = outletsQuery.data?.find((o) => o.id === oId);
    if (role && outlet && !title) {
      setTitle(`${role.name} — ${outlet.name}`);
    }
  }

  const generateMut = useMutation({
    mutationFn: () =>
      generateJobAd({
        role_id: roleId,
        outlet_id: outletId,
        employment_type: employmentType,
      }),
    onSuccess: (data) => {
      setDescription(data.description);
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      createJob({
        role_id: roleId,
        outlet_id: outletId,
        title,
        description: description || undefined,
        requirements: requirements.length > 0 ? requirements : undefined,
        employment_type: employmentType,
        closes_at: closesAt || undefined,
      }),
    onSuccess: (job) => {
      router.push(`/jobs/${job.id}`);
    },
  });

  const canGenerate = roleId && outletId && !generateMut.isPending;
  const canSave = roleId && outletId && title && !createMut.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-stone-600">
        Draft a new job posting. You can let Claude generate the description from the
        role's responsibilities, then edit before publishing.
      </p>

      <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
          Basic details
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" required>
            <select
              value={roleId}
              onChange={(e) => handleRoleChange(e.target.value)}
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

          <Field label="Outlet" required>
            <select
              value={outletId}
              onChange={(e) => handleOutletChange(e.target.value)}
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

          <Field label="Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              className={inputCls}
              placeholder="Cashier — Lead Superstore Bolanle"
            />
          </Field>

          <Field label="Employment type">
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={inputCls}
            >
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </Field>

          <Field label="Closes on (optional)">
            <input
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Description with AI generation */}
      <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <h2 className="text-sm font-semibold text-stone-800">Job description</h2>
          <button
            type="button"
            onClick={() => generateMut.mutate()}
            disabled={!canGenerate}
            className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            title={!roleId || !outletId ? "Pick role and outlet first" : "Generate with Claude"}
          >
            {generateMut.isPending ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Generate with Claude
              </>
            )}
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={16}
          placeholder="Write the job description here, or use 'Generate with Claude' to draft one from the role definition."
          className={`${inputCls} font-mono text-xs leading-relaxed`}
        />

        {generateMut.isError && (
          <ErrorState message={(generateMut.error as Error).message} />
        )}
      </div>

      {createMut.isError && <ErrorState message={(createMut.error as Error).message} />}

      {/* Requirements */}
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <div className="border-b border-stone-100 pb-2">
        <h2 className="text-sm font-semibold text-stone-800">Requirements</h2>
        <p className="mt-1 text-xs text-stone-500">
          Pre-filled from the role definition when you pick a role. Edit, reorder, or
          add new ones for this specific posting.
        </p>
      </div>
      <ListEditor
        value={requirements}
        onChange={setRequirements}
        placeholder="e.g. 1+ years experience in retail"
      />
    </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="rounded-md border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          onClick={() => createMut.mutate()}
          disabled={!canSave}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {createMut.isPending ? "Saving draft…" : "Save as draft"}
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