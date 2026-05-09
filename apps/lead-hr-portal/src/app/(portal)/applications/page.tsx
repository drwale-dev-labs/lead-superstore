"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Mail, Phone } from "lucide-react";
import { fetchApplications } from "@/lib/api/applications";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { ApplicationStatusBadge } from "@/components/ui/application-status-badge";
import type { ApplicationStatus } from "@/lib/types";

const STATUS_TABS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewed", label: "Interviewed" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");

  const query = useQuery({
    queryKey: ["applications", statusFilter],
    queryFn: () =>
      fetchApplications({
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  // Counts per status — needs an unfiltered query, so refetch them separately
  const allQuery = useQuery({
    queryKey: ["applications", "all"],
    queryFn: () => fetchApplications(),
  });

  const counts = useMemo(() => {
    if (!allQuery.data) return { all: 0 } as Record<string, number>;
    const result: Record<string, number> = { all: allQuery.data.length };
    for (const a of allQuery.data) {
      result[a.status] = (result[a.status] ?? 0) + 1;
    }
    return result;
  }, [allQuery.data]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Applications submitted via the public careers page. Click into an entry to
        review the candidate, leave notes, and move them through the hiring pipeline.
      </p>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          const count = counts[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${isActive ? "text-amber-100" : "text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {query.isLoading && <LoadingState label="Loading applications…" />}
      {query.isError && <ErrorState message={query.error.message} />}

      {query.data && query.data.length === 0 && (
        <EmptyState
          title="No applications yet"
          description={
            statusFilter === "all"
              ? "Applications will appear here as candidates apply via the careers page."
              : `No applications in '${statusFilter}' status.`
          }
        />
      )}

      {query.data && query.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Candidate</th>
                <th className="px-4 py-3 text-left font-medium">Applied for</th>
                <th className="px-4 py-3 text-left font-medium">Applied</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {query.data.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${a.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {a.first_name} {a.last_name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {a.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {a.phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-700">
                      {a.job_postings?.title ?? "—"}
                    </div>
                    {a.job_postings?.outlets?.name && (
                      <div className="text-xs text-stone-500">
                        {a.job_postings.outlets.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {new Date(a.applied_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ApplicationStatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}