"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  Receipt,
  Briefcase,
  FileText,
  Megaphone,
  GraduationCap,
  MessageSquare,
  UserPlus,
  BarChart3,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  group: "Overview" | "Recruitment" | "People" | "Compensation" | "Insights";
  badge?: "NEW";
};

const NAV_ITEMS: NavItem[] = [
  // Overview
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },

  // Recruitment
  { label: "Role directory", href: "/roles", icon: ClipboardList, group: "Recruitment" },
  { label: "Job ad generator", href: "/job-ads", icon: Megaphone, group: "Recruitment" },
  { label: "Aptitude tests", href: "/aptitude-tests", icon: GraduationCap, group: "Recruitment" },
  { label: "Interview questions", href: "/interviews", icon: MessageSquare, group: "Recruitment" },
  { label: "Jobs", href: "/jobs", icon: Briefcase, group: "Recruitment" },
  { label: "Applications inbox", href: "/applications", icon: FileText, group: "Recruitment", badge: "NEW" },

  // People
  { label: "Employees", href: "/staff", icon: Users, group: "People" },
  { label: "Onboarding", href: "/onboarding", icon: UserPlus, group: "People" },

  // Compensation
  { label: "Payroll · per outlet", href: "/payroll", icon: Wallet, group: "Compensation", badge: "NEW" },
  { label: "Deductions", href: "/deductions", icon: Receipt, group: "Compensation" },

  // Insights
  { label: "Reports", href: "/reports", icon: BarChart3, group: "Insights" },
];

const GROUPS = ["Overview", "Recruitment", "People", "Compensation", "Insights"] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-4">
        <div className="text-base font-semibold text-amber-700">
          Lead Superstore
        </div>
        <div className="text-[10px] uppercase tracking-wider text-stone-400">
          HR &amp; Administration
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group} className="mb-4">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                {group}
              </div>
              <ul>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-amber-50 font-medium text-amber-700"
                            : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 px-4 py-3">
        <div className="text-xs text-stone-500">Signed in as</div>
        <div className="text-sm font-medium text-stone-800">Admin</div>
      </div>
    </aside>
  );
}