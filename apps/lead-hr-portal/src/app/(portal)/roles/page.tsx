"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRoles } from "@/lib/api/roles";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { UnitTabs } from "@/components/ui/unit-tabs";
import { RoleDetail } from "@/components/roles/role-detail";
import type { Role } from "@/lib/types";

const UNIT_OPTIONS = [
  "All",
  "Facility",
  "Supermarket",
  "Bakery",
  "Restaurant",
  "Procurement",
  "Warehouse",
] as const;

export default function RoleDirectoryPage() {
  const [selectedUnit, setSelectedUnit] = useState<string>("All");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchRoles(),
  });

  const counts = useMemo(() => {
    if (!rolesQuery.data) return {};
    const result: Record<string, number> = { All: rolesQuery.data.length };
    for (const role of rolesQuery.data) {
      result[role.unit] = (result[role.unit] ?? 0) + 1;
    }
    return result;
  }, [rolesQuery.data]);

  const filteredRoles = useMemo(() => {
    if (!rolesQuery.data) return [];
    if (selectedUnit === "All") return rolesQuery.data;
    return rolesQuery.data.filter((r) => r.unit === selectedUnit);
  }, [rolesQuery.data, selectedUnit]);

  const selectedRole: Role | undefined = rolesQuery.data?.find(
    (r) => r.id === selectedRoleId,
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-stone-600">
          Browse all positions defined for Lead Superstore. Click a role to view full
          responsibilities and requirements.
        </p>
      </header>

      {rolesQuery.isLoading && <LoadingState label="Loading roles…" />}
      {rolesQuery.isError && <ErrorState message={rolesQuery.error.message} />}

      {rolesQuery.data && (
        <>
          <UnitTabs
            units={UNIT_OPTIONS}
            selected={selectedUnit}
            onSelect={(unit) => {
              setSelectedUnit(unit);
              setSelectedRoleId(null);
            }}
            counts={counts}
          />

          {filteredRoles.length === 0 ? (
            <EmptyState
              title={`No ${selectedUnit} roles defined yet`}
              description={
                selectedUnit === "Warehouse"
                  ? "Warehouse roles haven't been added to the role directory yet."
                  : "No roles match this filter."
              }
            />
          ) : (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRoles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    onClick={() =>
                      setSelectedRoleId(isSelected ? null : role.id)
                    }
                    className={`rounded-lg border bg-white p-4 text-left transition-colors ${
                      isSelected
                        ? "border-amber-700 ring-1 ring-amber-700"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="text-sm font-medium text-stone-900">
                      {role.name}
                    </div>
                    <div className="mt-1 text-xs text-stone-500">{role.unit}</div>
                  </button>
                );
              })}
            </section>
          )}

          {selectedRole && <RoleDetail role={selectedRole} />}
        </>
      )}
    </div>
  );
}