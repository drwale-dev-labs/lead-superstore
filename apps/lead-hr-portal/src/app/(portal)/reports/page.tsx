"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, Wallet, TrendingDown, ShoppingBag } from "lucide-react";
import {
  fetchHeadcountReport,
  fetchHiringFunnelReport,
  fetchPayrollSummaryReport,
  fetchTurnoverReport,
  fetchSalesReport,
} from "@/lib/api/reports";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { formatNaira } from "@/lib/types";

export default function ReportsPage() {
  const headcount = useQuery({ queryKey: ["report-headcount"], queryFn: fetchHeadcountReport });
  const funnel = useQuery({ queryKey: ["report-funnel"], queryFn: fetchHiringFunnelReport });
  const payroll = useQuery({ queryKey: ["report-payroll"], queryFn: fetchPayrollSummaryReport });
  const turnover = useQuery({ queryKey: ["report-turnover"], queryFn: fetchTurnoverReport });
  const sales = useQuery({ queryKey: ["report-sales"], queryFn: fetchSalesReport });

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Snapshot across HR and e-commerce. Figures update live as you use the portal.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Headcount */}
        <Card title="Headcount" icon={Users}>
          {headcount.isLoading && <LoadingState />}
          {headcount.isError && <ErrorState message={headcount.error.message} />}
          {headcount.data && (
            <>
              <BigStat value={headcount.data.total} label="Total staff records" />
              <MiniTable rows={Object.entries(headcount.data.by_status)} />
              <SectionLabel>By outlet (active + onboarding)</SectionLabel>
              <MiniTable rows={Object.entries(headcount.data.by_outlet)} />
            </>
          )}
        </Card>

        {/* Hiring funnel */}
        <Card title="Hiring funnel" icon={Briefcase}>
          {funnel.isLoading && <LoadingState />}
          {funnel.isError && <ErrorState message={funnel.error.message} />}
          {funnel.data && (
            <>
              <BigStat value={funnel.data.total_applications} label="Total applications" />
              <MiniTable rows={Object.entries(funnel.data.by_status)} />
              <SectionLabel>Conversion by job</SectionLabel>
              <div className="space-y-1.5">
                {funnel.data.by_job.slice(0, 6).map((j: any) => (
                  <div key={j.title} className="flex justify-between text-xs">
                    <span className="text-stone-600">{j.title}</span>
                    <span className="text-stone-800">
                      {j.hired}/{j.total} hired ({j.conversion_rate}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Payroll */}
        <Card title="Payroll" icon={Wallet}>
          {payroll.isLoading && <LoadingState />}
          {payroll.isError && <ErrorState message={payroll.error.message} />}
          {payroll.data && (
            <div className="space-y-1.5">
              {payroll.data.by_outlet.map((o: any) => (
                <div key={o.outlet} className="flex justify-between text-xs">
                  <span className="text-stone-600">
                    {o.outlet} ({o.periods} periods)
                  </span>
                  <span className="font-medium text-stone-800">
                    {formatNaira(o.total_net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Turnover */}
        <Card title="Turnover" icon={TrendingDown}>
          {turnover.isLoading && <LoadingState />}
          {turnover.isError && <ErrorState message={turnover.error.message} />}
          {turnover.data && (
            <>
              <BigStat value={`${turnover.data.turnover_rate_pct}%`} label="Turnover rate" />
              <MiniTable
                rows={[
                  ["Active staff", turnover.data.active_staff],
                  ["Terminated (all time)", turnover.data.terminated_count],
                  ["Avg. tenure (days)", turnover.data.avg_tenure_days ?? "—"],
                ]}
              />
            </>
          )}
        </Card>

        {/* Sales */}
        <Card title="Sales" icon={ShoppingBag}>
          {sales.isLoading && <LoadingState />}
          {sales.isError && <ErrorState message={sales.error.message} />}
          {sales.data && (
            <>
              <BigStat value={formatNaira(sales.data.total_revenue)} label="Total revenue (paid orders)" />
              <MiniTable
                rows={[
                  ["Total orders", sales.data.total_orders],
                  ["Paid orders", sales.data.paid_orders],
                ]}
              />
              <SectionLabel>By outlet</SectionLabel>
              <div className="space-y-1.5">
                {sales.data.by_outlet.map((o: any) => (
                  <div key={o.outlet} className="flex justify-between text-xs">
                    <span className="text-stone-600">
                      {o.outlet} ({o.orders} orders)
                    </span>
                    <span className="font-medium text-stone-800">
                      {formatNaira(o.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
        <Icon className="h-4 w-4 text-amber-700" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function BigStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="mb-4">
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
      {children}
    </div>
  );
}

function MiniTable({ rows }: { rows: [string, string | number][] }) {
  return (
    <div className="space-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-xs">
          <span className="capitalize text-stone-600">{label.replace(/_/g, " ")}</span>
          <span className="font-medium text-stone-800">{value}</span>
        </div>
      ))}
    </div>
  );
}