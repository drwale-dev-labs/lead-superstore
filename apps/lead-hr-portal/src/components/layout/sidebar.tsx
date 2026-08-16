"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  ShoppingBag,
  Boxes,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  group: "Overview" | "Recruitment" | "People" | "Compensation" | "E-commerce" | "Insights";
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

  // E-commerce
  { label: "Orders", href: "/orders", icon: ShoppingBag, group: "E-commerce", badge: "NEW" },
  { label: "Products & stock", href: "/products", icon: Boxes, group: "E-commerce" },
];

const GROUPS = ["Overview", "Recruitment", "People", "Compensation", "E-commerce", "Insights"] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-4">
        <div className="text-base font-semibold text-black">
          Lead <span className="text-orange-600">Superstore</span>
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
                            ? "bg-orange-50 font-medium text-orange-700"
                            : "text-stone-600 hover:bg-stone-50 hover:text-black"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-700">
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
        <div className="truncate text-sm font-medium text-black">
          {email ?? "…"}
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 flex items-center gap-1.5 text-xs text-stone-500 hover:text-black"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
        <div className="mt-3 border-t border-stone-100 pt-3 text-[10px] leading-tight text-stone-400">
          Developed by Bloomstone Technologies
          <br />
          Engineered with Intelligence
        </div>
      </div>
    </aside>
  );
}