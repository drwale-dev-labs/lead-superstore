"use client";

import { usePathname } from "next/navigation";

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
};

export function Topbar() {
  const pathname = usePathname();
  const titleEntry = Object.entries(PAGE_TITLES).find(([prefix]) =>
    pathname.startsWith(prefix),
  );
  const title = titleEntry?.[1] ?? "Lead Superstore";

  return (
    <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-6">
      <h1 className="text-base font-semibold text-stone-800">{title}</h1>
      <div className="text-xs text-stone-500">
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