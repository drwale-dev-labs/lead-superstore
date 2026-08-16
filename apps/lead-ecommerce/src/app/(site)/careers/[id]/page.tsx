"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  CheckCircle2,
  Send,
} from "lucide-react";
import { fetchPublicJob, submitApplication } from "@/lib/api/careers";

type Tab = "overview" | "application";

export default function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("overview");
  const [submitted, setSubmitted] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ["public-job", id],
    queryFn: () => fetchPublicJob(id),
  });

  const applyMut = useMutation({
    mutationFn: (payload: Parameters<typeof submitApplication>[0]) =>
      submitApplication(payload),
    onSuccess: () => setSubmitted(true),
  });

  if (jobQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-stone-500">
        Loading…
      </div>
    );
  }
  if (jobQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {jobQuery.error.message}
        </div>
      </div>
    );
  }
  if (!jobQuery.data) return null;

  const job = jobQuery.data;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const cv = form.get("cv") as File;
    const coverLetterText = (form.get("cover_letter") as string) || "";
    const coverLetterFile = form.get("cover_letter_file") as File;
    const certificate = form.get("certificate") as File;
    const nyscCertificate = form.get("nysc_certificate") as File;

    const hasCoverLetterText = coverLetterText.trim().length > 0;
    const hasCoverLetterFile = coverLetterFile && coverLetterFile.size > 0;
    if (!hasCoverLetterText && !hasCoverLetterFile) {
      setCoverLetterError("Paste a cover letter or upload a file.");
      return;
    }
    setCoverLetterError(null);

    applyMut.mutate({
      job_posting_id: id,
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      cover_letter: (form.get("cover_letter") as string) || undefined,
      cv: cv && cv.size > 0 ? cv : undefined,
      cover_letter_file:
        coverLetterFile && coverLetterFile.size > 0 ? coverLetterFile : undefined,
      certificate: certificate && certificate.size > 0 ? certificate : undefined,
      nysc_certificate:
        nyscCertificate && nyscCertificate.size > 0 ? nyscCertificate : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/careers"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All open roles
      </Link>

      {/* Job header */}
      <header className="mt-4 rounded-lg border border-stone-200 bg-white p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-stone-500">
          <Briefcase className="h-3.5 w-3.5" />
          {job.roles?.unit ?? "—"} unit
        </div>
        <h1 className="mt-2 text-2xl font-bold text-black">{job.title}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {job.outlets?.name ?? "—"}
          </span>
          <span className="text-stone-300">·</span>
          <span>{job.employment_type}</span>
          {job.closes_at && (
            <>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1 text-orange-700">
                <Calendar className="h-4 w-4" />
                Apply before {new Date(job.closes_at).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex gap-6 border-b border-stone-200">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={tab === "application"} onClick={() => setTab("application")}>
          Application
        </TabButton>
      </div>

      {tab === "overview" ? (
        <div>
          {/* Description */}
          {job.description && (
            <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Description
              </h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
                {job.description}
              </pre>
            </section>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Requirements
              </h2>
              <ul className="space-y-2">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-700" />
                    <span className="text-stone-700">{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setTab("application")}
              className="inline-flex items-center gap-2 rounded-md bg-orange-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
            >
              Apply for this job
            </button>
          </div>
        </div>
      ) : (
        <section className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-6">
          {submitted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-3 text-lg font-semibold text-black">
                Application received
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                Thank you. Our HR team has received your application and will reach
                out to you shortly if your profile matches what we&apos;re looking for.
              </p>
              <Link
                href="/careers"
                className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
              >
                View other roles
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-black">
                Apply for this role
              </h2>
              <p className="text-xs text-stone-600">
                Fill in the form below. We review every application and reply within 7 days.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <input name="first_name" required className={inputCls} />
                </Field>
                <Field label="Last name" required>
                  <input name="last_name" required className={inputCls} />
                </Field>
                <Field label="Email" required>
                  <input name="email" type="email" required className={inputCls} />
                </Field>
                <Field label="Phone" required>
                  <input
                    name="phone"
                    type="tel"
                    required
                    pattern="[0-9+]{7,20}"
                    placeholder="08012345678"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Cover letter" required>
                <textarea
                  name="cover_letter"
                  rows={6}
                  placeholder="Tell us briefly why you're a good fit. Mention relevant experience and what you'd bring to the role."
                  className={inputCls}
                />
              </Field>
              <Field label="Or upload a cover letter file" required>
                <input
                  name="cover_letter_file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className={fileInputCls}
                />
              </Field>
              <p className="-mt-2 text-xs text-stone-500">
                Provide a cover letter either as pasted text above or as an uploaded file.
              </p>
              {coverLetterError && (
                <p className="-mt-2 text-xs text-red-600">{coverLetterError}</p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="CV / resume" required>
                  <input
                    name="cv"
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={fileInputCls}
                  />
                </Field>
                <Field label="Certificate" required>
                  <input
                    name="certificate"
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={fileInputCls}
                  />
                </Field>
                <Field label="NYSC certificate (optional)">
                  <input
                    name="nysc_certificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={fileInputCls}
                  />
                </Field>
              </div>
              <p className="text-xs text-stone-500">
                Accepted formats: PDF, JPEG, PNG. Max 5MB per file.
              </p>

              {applyMut.isError && (
                <div className="rounded-md border border-red-200 bg-white p-3 text-xs text-red-700">
                  {(applyMut.error as Error).message}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={applyMut.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {applyMut.isPending ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none";

const fileInputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-orange-800 focus:border-orange-700 focus:outline-none";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-orange-700 text-orange-700"
          : "border-transparent text-stone-500 hover:text-stone-700"
      }`}
    >
      {children}
    </button>
  );
}

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
