"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ArrowRight, UserPlus, Shield, FileSignature, Camera } from "lucide-react";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";
import { createStaff, activateStaff } from "@/lib/api/staff";
import {
  addReference,
  addGuarantor,
  uploadStaffPhoto,
} from "@/lib/api/verification";
import { LoadingState, ErrorState } from "@/components/ui/states";
import type { ReferenceType, Staff } from "@/lib/types";

type Stage = "register" | "photo" | "reference" | "guarantor" | "review";

export default function OnboardingPage() {
  const [stage, setStage] = useState<Stage>("register");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [photoDone, setPhotoDone] = useState(false);
  const [refDone, setRefDone] = useState(false);
  const [guarDone, setGuarDone] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const stages: { key: Stage; label: string; icon: typeof UserPlus }[] = [
    { key: "register", label: "Register", icon: UserPlus },
    { key: "photo", label: "Photo", icon: Camera },
    { key: "reference", label: "Reference", icon: FileSignature },
    { key: "guarantor", label: "Guarantor", icon: Shield },
    { key: "review", label: "Activate", icon: Check },
  ];

  const currentIdx = stages.findIndex((s) => s.key === stage);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-stone-600">
        Complete all five steps to onboard and activate a new employee. Photo, reference,
        and guarantor are required before activation.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-3">
        {stages.map((s, idx) => {
          const Icon = s.icon;
          const done =
            (s.key === "register" && staff !== null) ||
            (s.key === "photo" && photoDone) ||
            (s.key === "reference" && refDone) ||
            (s.key === "guarantor" && guarDone);
          const active = idx === currentIdx;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-1.5">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-green-100 text-green-700"
                    : active
                      ? "bg-amber-700 text-white"
                      : "bg-stone-100 text-stone-500"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[10px] uppercase tracking-wide ${
                    active ? "text-stone-700" : "text-stone-400"
                  }`}
                >
                  Step {idx + 1}
                </div>
                <div className="truncate text-xs font-medium text-stone-600">
                  {s.label}
                </div>
              </div>
              {idx < stages.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-stone-300" />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage content */}
      {stage === "register" && (
        <RegisterStage
          onSuccess={(s) => {
            setStaff(s);
            setStage("photo");
            qc.invalidateQueries({ queryKey: ["staff"] });
          }}
        />
      )}
      {stage === "photo" && staff && (
        <PhotoStage
          staffId={staff.id}
          onDone={() => {
            setPhotoDone(true);
            setStage("reference");
            qc.invalidateQueries({ queryKey: ["staff", staff.id] });
          }}
        />
      )}
      {stage === "reference" && staff && (
        <ReferenceStage
          staffId={staff.id}
          onDone={() => {
            setRefDone(true);
            setStage("guarantor");
          }}
        />
      )}
      {stage === "guarantor" && staff && (
        <GuarantorStage
          staffId={staff.id}
          onDone={() => {
            setGuarDone(true);
            setStage("review");
          }}
        />
      )}
      {stage === "review" && staff && (
        <ReviewStage
          staff={staff}
          onActivated={() => {
            qc.invalidateQueries({ queryKey: ["staff"] });
            router.push(`/staff/${staff.id}`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Stage 1 — Register
// ============================================================================

function RegisterStage({ onSuccess }: { onSuccess: (s: Staff) => void }) {
  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => fetchRoles() });

  const mutation = useMutation({
    mutationFn: createStaff,
    onSuccess,
  });

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      outlet_id: form.get("outlet_id") as string,
      role_id: form.get("role_id") as string,
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      hired_at: form.get("hired_at") as string,
      bank_name: (form.get("bank_name") as string) || null,
      bank_account_number: (form.get("bank_account_number") as string) || null,
      bank_account_name: (form.get("bank_account_name") as string) || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <SectionTitle>Personal &amp; employment details</SectionTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <input name="first_name" required className={inputCls} />
        </Field>
        <Field label="Last name" required>
          <input name="last_name" required className={inputCls} />
        </Field>
        <Field label="Phone">
          <input name="phone" className={inputCls} placeholder="08012345678" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputCls} />
        </Field>
        <Field label="Outlet" required>
          <select name="outlet_id" required disabled={outletsQuery.isLoading} className={inputCls}>
            <option value="">
              {outletsQuery.isLoading
                ? "Loading outlets…"
                : outletsQuery.isError
                  ? "Failed to load outlets"
                  : "Select…"}
            </option>
            {outletsQuery.data?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Role" required>
          <select name="role_id" required disabled={rolesQuery.isLoading} className={inputCls}>
            <option value="">
              {rolesQuery.isLoading
                ? "Loading roles…"
                : rolesQuery.isError
                  ? "Failed to load roles"
                  : "Select…"}
            </option>
            {rolesQuery.data?.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
            ))}
          </select>
        </Field>
        <Field label="Hire date" required>
          <input name="hired_at" type="date" required defaultValue={today} className={inputCls} />
        </Field>
      </div>

      <SectionTitle>Bank details</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Bank name">
          <input name="bank_name" className={inputCls} placeholder="GTBank" />
        </Field>
        <Field label="Account number">
          <input name="bank_account_number" maxLength={10} className={inputCls} placeholder="0123456789" />
        </Field>
        <Field label="Account name">
          <input name="bank_account_name" className={inputCls} />
        </Field>
      </div>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Registering…" : "Register & continue"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Stage 2 — Photo
// ============================================================================

function PhotoStage({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return uploadStaffPhoto(staffId, file);
    },
    onSuccess: onDone,
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <SectionTitle>Profile photo</SectionTitle>
      <p className="text-xs text-stone-500">
        Required. A clear face photo. JPEG, PNG, or WebP — max 2 MB.
      </p>

      <div className="flex items-start gap-6">
        {/* Preview */}
        <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-10 w-10 text-stone-300" />
          )}
        </div>

        {/* Upload control */}
        <div className="flex-1 space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100"
          />
          {file && (
            <p className="text-xs text-stone-500">
              Selected: <span className="font-medium text-stone-700">{file.name}</span>{" "}
              ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
      </div>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end pt-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!file || mutation.isPending}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Uploading…" : "Upload & continue"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Stage 3 — Reference
// ============================================================================

function ReferenceStage({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof addReference>[1]) =>
      addReference(staffId, payload),
    onSuccess: onDone,
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("document") as File;
    mutation.mutate({
      reference_type: form.get("reference_type") as ReferenceType,
      full_name: form.get("full_name") as string,
      phone: form.get("phone") as string,
      relationship: form.get("relationship") as string,
      email: (form.get("email") as string) || undefined,
      organization: (form.get("organization") as string) || undefined,
      note: (form.get("note") as string) || undefined,
      document: file && file.size > 0 ? file : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <SectionTitle>Reference</SectionTitle>
      <p className="text-xs text-stone-500">
        Add at least one reference: a previous employer, community leader, or religious
        leader. You can attach a written reference letter.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Reference type" required>
          <select name="reference_type" required defaultValue="previous_employer" className={inputCls}>
            <option value="previous_employer">Previous employer</option>
            <option value="community_leader">Community leader</option>
            <option value="religious_leader">Religious leader</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Full name" required>
          <input name="full_name" required className={inputCls} />
        </Field>
        <Field label="Phone" required>
          <input name="phone" required className={inputCls} placeholder="08012345678" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputCls} />
        </Field>
        <Field label="Organization">
          <input name="organization" className={inputCls} placeholder="Company / mosque / church name" />
        </Field>
        <Field label="Relationship" required>
          <input name="relationship" required className={inputCls} placeholder="Former manager at XYZ Stores" />
        </Field>
      </div>

      <Field label="Note / what they said">
        <textarea name="note" rows={3} className={inputCls} placeholder="Any details about character, performance, length of relationship…" />
      </Field>

      <Field label="Reference letter (JPEG, PNG, or PDF — max 5 MB)">
        <input
          name="document"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100"
        />
      </Field>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Stage 4 — Guarantor
// ============================================================================

function GuarantorStage({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof addGuarantor>[1]) =>
      addGuarantor(staffId, payload),
    onSuccess: onDone,
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("document") as File;
    mutation.mutate({
      full_name: form.get("full_name") as string,
      phone: form.get("phone") as string,
      address: form.get("address") as string,
      occupation: form.get("occupation") as string,
      relationship: form.get("relationship") as string,
      email: (form.get("email") as string) || undefined,
      id_type: (form.get("id_type") as string) || undefined,
      id_number: (form.get("id_number") as string) || undefined,
      note: (form.get("note") as string) || undefined,
      document: file && file.size > 0 ? file : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <SectionTitle>Guarantor</SectionTitle>
      <p className="text-xs text-stone-500">
        A guarantor vouches for the employee. Capture full contact details and ideally an
        ID number. Attach the signed guarantor form if available.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input name="full_name" required className={inputCls} />
        </Field>
        <Field label="Phone" required>
          <input name="phone" required className={inputCls} placeholder="08012345678" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputCls} />
        </Field>
        <Field label="Occupation" required>
          <input name="occupation" required className={inputCls} />
        </Field>
        <Field label="Relationship to employee" required>
          <input name="relationship" required className={inputCls} placeholder="Uncle / Pastor / Family friend" />
        </Field>
        <Field label="ID type">
          <select name="id_type" defaultValue="" className={inputCls}>
            <option value="">— Select —</option>
            <option value="NIN">NIN</option>
            <option value="BVN">BVN</option>
            <option value="voters_card">Voter's card</option>
            <option value="drivers_license">Driver's license</option>
            <option value="international_passport">International passport</option>
          </select>
        </Field>
        <Field label="ID number">
          <input name="id_number" className={inputCls} />
        </Field>
      </div>

      <Field label="Address" required>
        <textarea name="address" required rows={2} className={inputCls} placeholder="House no., street, area, city, state" />
      </Field>

      <Field label="Note">
        <textarea name="note" rows={2} className={inputCls} />
      </Field>

      <Field label="Signed guarantor form (JPEG, PNG, or PDF — max 5 MB)">
        <input
          name="document"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100"
        />
      </Field>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Stage 5 — Review & activate
// ============================================================================

function ReviewStage({ staff, onActivated }: { staff: Staff; onActivated: () => void }) {
  const mutation = useMutation({
    mutationFn: () => activateStaff(staff.id),
    onSuccess: onActivated,
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
      <SectionTitle>Ready to activate</SectionTitle>

      <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        <div className="flex items-center gap-2 font-medium">
          <Check className="h-4 w-4" />
          Verification complete
        </div>
        <ul className="mt-2 ml-6 list-disc space-y-1 text-green-700">
          <li>Photo uploaded</li>
          <li>Reference recorded</li>
          <li>Guarantor recorded</li>
        </ul>
      </div>

      <p className="text-sm text-stone-600">
        Activating <strong>{staff.first_name} {staff.last_name}</strong> will move them
        from <em>Onboarding</em> to <em>Active</em>. They will be eligible for payroll
        from the next period.
      </p>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={`/staff/${staff.id}`}
          className="rounded-md border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Skip activation, view profile
        </Link>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-md bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Activating…" : "Activate employee"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Tiny shared UI helpers
// ============================================================================

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
      {children}
    </h3>
  );
}