"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { fetchStaff } from "@/lib/api/staff";
import { fetchOutlets } from "@/lib/api/outlets";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StaffStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: StaffStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
];

export default function EmployeesPage() {
  const [outletId, setOutletId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [search, setSearch] = useState("");

  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const staffQuery = useQuery({
    queryKey: ["staff", outletId, statusFilter, search],
    queryFn: () =>
      fetchStaff({
        outlet_id: outletId === "all" ? undefined : outletId,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
      }),
  });

  const counts = useMemo(() => {
    if (!staffQuery.data) return null;
    return {
      total: staffQuery.data.length,
      active: staffQuery.data.filter((s) => s.status === "active").length,
      onboarding: staffQuery.data.filter((s) => s.status === "onboarding").length,
    };
  }, [staffQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          All staff across outlets. Click a row to view full profile, references, and
          payroll details.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          <UserPlus className="h-4 w-4" />
          Onboard new hire
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-stone-600">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name…"
              className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-stone-600">Outlet</label>
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
          >
            <option value="all">All outlets</option>
            {outletsQuery.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-stone-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StaffStatus | "all")}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {counts && (
          <div className="ml-auto text-xs text-stone-500">
            <span className="font-medium text-stone-700">{counts.total}</span> shown ·{" "}
            <span className="font-medium text-green-700">{counts.active}</span> active ·{" "}
            <span className="font-medium text-amber-700">{counts.onboarding}</span> onboarding
          </div>
        )}
      </div>

      {/* List */}
      {staffQuery.isLoading && <LoadingState label="Loading staff…" />}
      {staffQuery.isError && <ErrorState message={staffQuery.error.message} />}

      {staffQuery.data && staffQuery.data.length === 0 && (
        <EmptyState
          title="No staff found"
          description="Try adjusting filters or onboard a new hire."
        />
      )}

      {staffQuery.data && staffQuery.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Outlet</th>
                <th className="px-4 py-3 text-left font-medium">Hired</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staffQuery.data.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/staff/${s.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {s.first_name} {s.last_name}
                    </Link>
                    {s.phone && (
                      <div className="text-xs text-stone-500">{s.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {s.roles?.name ?? "—"}
                    {s.roles?.unit && (
                      <div className="text-xs text-stone-500">{s.roles.unit}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {s.outlets?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {s.hired_at ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
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