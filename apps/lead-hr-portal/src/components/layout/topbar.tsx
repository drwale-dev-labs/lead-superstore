"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchStaff } from "@/lib/api/staff";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/roles": "Role directory",
  "/job-ads": "Job ad generator",
  "/aptitude-tests": "Aptitude tests",
  "/interviews": "Interview questions",
  "/jobs": "Job postings",
  "/applications": "Applications inbox",
  "/staff": "Employees",
  "/onboarding": "Onboarding",
  "/payroll": "Payroll",
  "/deductions": "Deductions",
  "/reports": "Reports",
  "/orders": "Orders",
  "/products": "Products & stock",
  "/accounts": "Accounts",
};

export function Topbar() {
  const pathname = usePathname();
  const titleEntry = Object.entries(PAGE_TITLES).find(([prefix]) =>
    pathname.startsWith(prefix),
  );
  const title = titleEntry?.[1] ?? "Lead Superstore";

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-stone-200 bg-white px-6">
      <h1 className="flex-shrink-0 text-base font-semibold text-black">{title}</h1>
      <StaffSearch />
      <div className="flex-shrink-0 text-xs text-stone-500">
        {new Date().toLocaleDateString("en-NG", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </header>
  );
}

function StaffSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchQuery = useQuery({
    queryKey: ["staff-search", query],
    queryFn: () => fetchStaff({ search: query }),
    enabled: query.trim().length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = query.trim().length >= 2 ? (searchQuery.data ?? []) : [];

  function goToStaff(id: string) {
    setQuery("");
    setOpen(false);
    router.push(`/staff/${id}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search staff by name…"
        className="w-full rounded-md border border-stone-300 bg-stone-50 py-1.5 pl-9 pr-3 text-sm focus:border-orange-700 focus:bg-white focus:outline-none"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {searchQuery.isLoading && (
            <p className="px-3 py-2 text-xs text-stone-500">Searching…</p>
          )}
          {searchQuery.isError && (
            <p className="px-3 py-2 text-xs text-red-600">Search failed.</p>
          )}
          {!searchQuery.isLoading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-stone-500">No staff found.</p>
          )}
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => goToStaff(s.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50"
            >
              <span className="min-w-0 truncate font-medium text-black">
                {s.first_name} {s.last_name}
              </span>
              <span className="flex-shrink-0 text-xs text-stone-500">
                {s.roles?.name ?? "—"}
                {s.outlets?.name ? ` · ${s.outlets.name}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}