"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Hourglass } from "lucide-react";
import { fetchAssignments } from "@/lib/api/transfers";
import { LoadingState, ErrorState } from "@/components/ui/states";

export function AssignmentHistory({ staffId }: { staffId: string }) {
  const query = useQuery({
    queryKey: ["assignments", staffId],
    queryFn: () => fetchAssignments(staffId),
  });

  if (query.isLoading) return <LoadingState label="Loading history…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data || query.data.length === 0) {
    return <p className="text-xs text-stone-500">No assignment history recorded.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-stone-200 pl-5">
      {query.data.map((a) => {
        const isCurrent = a.ended_at === null;
        return (
          <li key={a.id} className="relative">
            {/* Dot */}
            <span
              className={`absolute -left-[27px] mt-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${
                isCurrent ? "bg-amber-700" : "bg-stone-300"
              }`}
              aria-hidden
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-900">
                  {a.roles?.name ?? "—"}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    @ {a.outlets?.name ?? "—"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {a.roles?.unit && <span>{a.roles.unit} unit · </span>}
                  {formatDate(a.started_at)}
                  {a.ended_at ? ` → ${formatDate(a.ended_at)}` : " → present"}
                </div>
                {a.transfer_reason && !a.is_imported && (
                  <p className="mt-1.5 text-xs text-stone-600">
                    <span className="font-medium">Reason: </span>
                    {a.transfer_reason}
                  </p>
                )}
                {a.approved_by_name && (
                  <p className="mt-0.5 text-xs text-stone-500">
                    Approved by {a.approved_by_name}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                {isCurrent && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                    Current
                  </span>
                )}
                {a.is_imported && (
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
                    Imported
                  </span>
                )}
                {!a.is_imported && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.is_approved
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {a.is_approved ? (
                      <>
                        <Check className="h-2.5 w-2.5" /> Approved
                      </>
                    ) : (
                      <>
                        <Hourglass className="h-2.5 w-2.5" /> Pending
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}