"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Briefcase } from "lucide-react";
import { fetchJobs } from "@/lib/api/jobs";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { JobStatusBadge } from "@/components/ui/job-status-badge";
import type { JobStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: JobStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
];

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  const jobsQuery = useQuery({
    queryKey: ["jobs", statusFilter],
    queryFn: () =>
      fetchJobs({ status: statusFilter === "all" ? undefined : statusFilter }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          All job postings. Drafts are private; publish to make them visible on the
          public careers page.
        </p>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          <Plus className="h-4 w-4" />
          Create job posting
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-stone-600">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-amber-700 focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {jobsQuery.isLoading && <LoadingState label="Loading jobs…" />}
      {jobsQuery.isError && <ErrorState message={jobsQuery.error.message} />}

      {jobsQuery.data && jobsQuery.data.length === 0 && (
        <EmptyState
          title="No job postings yet"
          description="Click 'Create job posting' to draft your first one."
        />
      )}

      {jobsQuery.data && jobsQuery.data.length > 0 && (
        <div className="space-y-3">
          {jobsQuery.data.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block rounded-lg border border-stone-200 bg-white p-5 transition-colors hover:border-amber-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.roles?.unit ?? "—"} · {job.outlets?.name ?? "—"}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-stone-900">
                    {job.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                    <span>{job.employment_type}</span>
                    {job.closes_at && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span>Closes {new Date(job.closes_at).toLocaleDateString()}</span>
                      </>
                    )}
                    {job.published_at && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span>
                          Published {new Date(job.published_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <JobStatusBadge status={job.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}