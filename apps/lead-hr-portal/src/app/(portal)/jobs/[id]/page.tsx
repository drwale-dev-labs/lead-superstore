"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  XCircle,
  Briefcase,
  Calendar,
  MapPin,
  Save,
  Pencil,
} from "lucide-react";
import {
  fetchJobById,
  publishJob,
  closeJob,
  updateJob,
} from "@/lib/api/jobs";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { JobStatusBadge } from "@/components/ui/job-status-badge";
import { ListEditor } from "@/components/ui/list-editor";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editingReqs, setEditingReqs] = useState(false);
const [editedRequirements, setEditedRequirements] = useState<string[]>([]);

  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJobById(id),
  });

  const publishMut = useMutation({
    mutationFn: () => publishJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const closeMut = useMutation({
    mutationFn: () => closeJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const updateMut = useMutation({
    mutationFn: () => updateJob(id, { description: editedDescription }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      setEditing(false);
    },
  });

  const updateReqsMut = useMutation({
    mutationFn: () => updateJob(id, { requirements: editedRequirements }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      setEditingReqs(false);
    },
  });

  if (jobQuery.isLoading) return <LoadingState label="Loading job…" />;
  if (jobQuery.isError) return <ErrorState message={jobQuery.error.message} />;
  if (!jobQuery.data) return <ErrorState message="Job not found" />;

  const job = jobQuery.data;

  function startEditing() {
    setEditedDescription(job.description ?? "");
    setEditing(true);
  }

  function startEditingReqs() {
    setEditedRequirements(job.requirements ?? []);
    setEditingReqs(true);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All jobs
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Briefcase className="h-3.5 w-3.5" />
              {job.roles?.unit ?? "—"} unit
            </div>
            <h1 className="mt-1 text-xl font-semibold text-stone-900">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.outlets?.name ?? "—"}
              </span>
              <span className="text-stone-300">·</span>
              <span>{job.employment_type}</span>
              {job.closes_at && (
                <>
                  <span className="text-stone-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Closes {new Date(job.closes_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <JobStatusBadge status={job.status} />
            <div className="flex gap-2">
              {job.status === "draft" && (
                <button
                  onClick={() => publishMut.mutate()}
                  disabled={publishMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {publishMut.isPending ? "Publishing…" : "Publish"}
                </button>
              )}
              {job.status === "published" && (
                <button
                  onClick={() => {
                    if (confirm("Close this job? No new applications will be accepted.")) {
                      closeMut.mutate();
                    }
                  }}
                  disabled={closeMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {closeMut.isPending ? "Closing…" : "Close job"}
                </button>
              )}
            </div>
          </div>
        </div>

        {publishMut.isError && (
          <p className="mt-3 text-xs text-red-600">{publishMut.error.message}</p>
        )}
        {closeMut.isError && (
          <p className="mt-3 text-xs text-red-600">{closeMut.error.message}</p>
        )}
      </header>

      {/* Description */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Job description
          </h2>
          {!editing && job.status !== "closed" && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={20}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed focus:border-amber-700 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMut.mutate()}
                disabled={updateMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {updateMut.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
            {job.description ?? "No description yet."}
          </pre>
        )}
      </section>

      {/* Requirements */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Requirements
          </h2>
          {!editingReqs && job.status !== "closed" && (
            <button
              onClick={startEditingReqs}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {editingReqs ? (
          <div className="space-y-3">
            <ListEditor
              value={editedRequirements}
              onChange={setEditedRequirements}
              placeholder="e.g. 1+ years experience in retail"
            />
            {updateReqsMut.isError && (
              <p className="text-xs text-red-600">
                {(updateReqsMut.error as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingReqs(false)}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateReqsMut.mutate()}
                disabled={updateReqsMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {updateReqsMut.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : job.requirements && job.requirements.length > 0 ? (
          <ul className="space-y-2">
            {job.requirements.map((req, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
                <span className="text-stone-700">{req}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-stone-500">No requirements specified yet.</p>
        )}
      </section>
      {/* Public preview hint */}
      {job.status === "published" && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4 text-xs text-green-800">
          <strong>Live on careers page.</strong> This job is visible to applicants on
          the e-commerce careers page (we'll wire that up in Step 14b).
        </section>
      )}
    </div>
  );
}