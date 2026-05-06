"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOutlets } from "@/lib/api/outlets";
import { fetchRoles } from "@/lib/api/roles";

export default function DashboardPage() {
  const outletsQuery = useQuery({
    queryKey: ["outlets"],
    queryFn: fetchOutlets,
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchRoles(),
  });

  return (
    <main className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-900">
            Lead Superstore — HR Portal
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Connection sanity check — fetched live from the FastAPI backend.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Outlets */}
          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Outlets
            </h2>
            {outletsQuery.isLoading && (
              <p className="text-sm text-stone-500">Loading outlets…</p>
            )}
            {outletsQuery.isError && (
              <p className="text-sm text-red-600">
                Error: {outletsQuery.error.message}
              </p>
            )}
            {outletsQuery.data && (
              <ul className="space-y-2">
                {outletsQuery.data.map((outlet) => (
                  <li
                    key={outlet.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-stone-800">
                      {outlet.name}
                    </span>
                    <span className="text-xs text-stone-500">
                      {outlet.is_warehouse ? "Warehouse" : outlet.city}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Roles */}
          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Roles by unit
            </h2>
            {rolesQuery.isLoading && (
              <p className="text-sm text-stone-500">Loading roles…</p>
            )}
            {rolesQuery.isError && (
              <p className="text-sm text-red-600">
                Error: {rolesQuery.error.message}
              </p>
            )}
            {rolesQuery.data && (
              <ul className="space-y-1 text-sm">
                {Object.entries(
                  rolesQuery.data.reduce<Record<string, number>>(
                    (acc, role) => {
                      acc[role.unit] = (acc[role.unit] ?? 0) + 1;
                      return acc;
                    },
                    {},
                  ),
                ).map(([unit, count]) => (
                  <li
                    key={unit}
                    className="flex items-center justify-between"
                  >
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
          </div>
        </section>

        <footer className="mt-8 text-xs text-stone-400">
          API:{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5">
            {process.env.NEXT_PUBLIC_API_BASE_URL}
          </code>
        </footer>
      </div>
    </main>
  );
}