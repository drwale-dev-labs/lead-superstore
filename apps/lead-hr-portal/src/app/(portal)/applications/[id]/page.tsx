"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Save,
  Briefcase,
  MapPin,
  Calendar,
} from "lucide-react";
import { fetchApplicationById, updateApplication } from "@/lib/api/applications";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ApplicationStatusBadge } from "@/components/ui/application-status-badge";
import type { ApplicationStatus } from "@/lib/types";

const PIPELINE_STAGES: { value: ApplicationStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewed", label: "Interviewed" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const query = useQuery({
    queryKey: ["application", id],
    queryFn: () => fetchApplicationById(id),
  });

  // Sync notes from server when data arrives or changes
  useEffect(() => {
    if (query.data && !notesDirty) {
      setNotes(query.data.notes ?? "");
    }
  }, [query.data, notesDirty]);

  const statusMut = useMutation({
    mutationFn: (status: ApplicationStatus) => updateApplication(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const notesMut = useMutation({
    mutationFn: () => updateApplication(id, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application", id] });
      setNotesDirty(false);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading application…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data) return <ErrorState message="Application not found" />;

  const a = query.data;

  return (
    <div className="space-y-6">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All applications
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-stone-900">
              {a.first_name} {a.last_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <a
                href={`mailto:${a.email}`}
                className="inline-flex items-center gap-1 hover:text-amber-700"
              >
                <Mail className="h-3 w-3" /> {a.email}
              </a>
              <span className="text-stone-300">·</span>
              <a
                href={`tel:${a.phone}`}
                className="inline-flex items-center gap-1 hover:text-amber-700"
              >
                <Phone className="h-3 w-3" /> {a.phone}
              </a>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Applied{" "}
                {new Date(a.applied_at).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          <ApplicationStatusBadge status={a.status} />
        </div>

        {/* Job context */}
        <div className="mt-4 rounded-md bg-stone-50 p-3 text-xs">
          <div className="flex items-center gap-2 text-stone-500">
            <Briefcase className="h-3 w-3" />
            Applying for
          </div>
          <div className="mt-1 font-medium text-stone-800">
            {a.job_postings?.title ?? "—"}
          </div>
          {a.job_postings?.outlets?.name && (
            <div className="mt-0.5 flex items-center gap-1 text-stone-500">
              <MapPin className="h-3 w-3" />
              {a.job_postings.outlets.name}
            </div>
          )}
          <Link
            href={`/jobs/${a.job_posting_id}`}
            className="mt-2 inline-block text-amber-700 hover:underline"
          >
            View job posting →
          </Link>
        </div>
      </header>

      {/* Pipeline stage selector */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Move through pipeline
        </h2>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const isCurrent = stage.value === a.status;
            return (
              <button
                key={stage.value}
                onClick={() => {
                  if (!isCurrent) statusMut.mutate(stage.value);
                }}
                disabled={isCurrent || statusMut.isPending}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-amber-300 hover:text-amber-700"
                } ${statusMut.isPending ? "opacity-50" : ""}`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
        {statusMut.isError && (
          <p className="mt-3 text-xs text-red-600">
            {(statusMut.error as Error).message}
          </p>
        )}
      </section>

      {/* Cover letter */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Cover letter
        </h2>
        {a.cover_letter ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {a.cover_letter}
          </p>
        ) : (
          <p className="text-xs text-stone-500">No cover letter submitted.</p>
        )}
      </section>

      {/* Resume */}
      {a.resume_url && (
        <section className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <FileText className="h-3.5 w-3.5" />
            Resume
          </h2>
          <a
            href={a.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            <FileText className="h-3.5 w-3.5" />
            Open resume
          </a>
        </section>
      )}

      {/* Internal notes */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Internal notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={5}
          placeholder="Add notes about this candidate — interview impressions, salary expectations, follow-up actions…"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
        />
        {notesMut.isError && (
          <p className="mt-2 text-xs text-red-600">
            {(notesMut.error as Error).message}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => notesMut.mutate()}
            disabled={!notesDirty || notesMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {notesMut.isPending ? "Saving…" : "Save notes"}
          </button>
        </div>
      </section>
    </div>
  );
}