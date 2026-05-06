"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";
import { Building2, ClipboardList } from "lucide-react";

export default function DashboardPage() {
  const outletsQuery = useQuery({
    queryKey: ["outlets"],
    queryFn: fetchOutlets,
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchRoles(),
  });

  const totalRoles = rolesQuery.data?.length ?? 0;
  const totalOutlets = outletsQuery.data?.length ?? 0;
  const operatingOutlets = outletsQuery.data?.filter((o) => !o.is_warehouse).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outlets" value={totalOutlets} sub={`${operatingOutlets} operating + warehouse`} icon={Building2} />
        <StatCard label="Roles defined" value={totalRoles} sub="across all units" icon={ClipboardList} />
        <StatCard label="Active staff" value="—" sub="connect employees in step 12" />
        <StatCard label="Open jobs" value="—" sub="connect jobs in step 14" />
      </section>

      {/* Detail row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Outlets">
          {outletsQuery.isLoading && <p className="text-sm text-stone-500">Loading…</p>}
          {outletsQuery.isError && <p className="text-sm text-red-600">{outletsQuery.error.message}</p>}
          {outletsQuery.data && (
            <ul className="space-y-2">
              {outletsQuery.data.map((outlet) => (
                <li key={outlet.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{outlet.name}</span>
                  <span className="text-xs text-stone-500">
                    {outlet.is_warehouse ? "Warehouse" : outlet.city}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Roles by unit">
          {rolesQuery.isLoading && <p className="text-sm text-stone-500">Loading…</p>}
          {rolesQuery.isError && <p className="text-sm text-red-600">{rolesQuery.error.message}</p>}
          {rolesQuery.data && (
            <ul className="space-y-1 text-sm">
              {Object.entries(
                rolesQuery.data.reduce<Record<string, number>>((acc, role) => {
                  acc[role.unit] = (acc[role.unit] ?? 0) + 1;
                  return acc;
                }, {}),
              )
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([unit, count]) => (
                  <li key={unit} className="flex items-center justify-between py-1">
                    <span className="text-stone-700">{unit}</span>
                    <span className="text-stone-500">{count} roles</span>
                  </li>
                ))}
              <li className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2 font-medium">
                <span>Total</span>
                <span>{rolesQuery.data.length}</span>
              </li>
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon?: typeof Building2;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-stone-400" />}
      </div>
      <div className="mt-2 text-2xl font-semibold text-stone-900">{value}</div>
      <div className="mt-1 text-xs text-stone-500">{sub}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </div>
  );
}