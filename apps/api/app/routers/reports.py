from datetime import date

from fastapi import APIRouter

from app.core.db import get_supabase

router = APIRouter()


@router.get("/headcount")
def headcount_report():
    supabase = get_supabase()
    staff = (
        supabase.table("staff")
        .select("status, outlet_id, role_id, outlets(name), roles(unit)")
        .execute()
        .data
    )

    by_status: dict[str, int] = {}
    by_outlet: dict[str, int] = {}
    by_unit: dict[str, int] = {}

    for s in staff:
        by_status[s["status"]] = by_status.get(s["status"], 0) + 1
        if s["status"] in ("active", "onboarding"):
            outlet_name = (s.get("outlets") or {}).get("name", "Unassigned")
            by_outlet[outlet_name] = by_outlet.get(outlet_name, 0) + 1
            unit = (s.get("roles") or {}).get("unit", "Unassigned")
            by_unit[unit] = by_unit.get(unit, 0) + 1

    return {
        "total": len(staff),
        "by_status": by_status,
        "by_outlet": by_outlet,
        "by_unit": by_unit,
    }


@router.get("/hiring-funnel")
def hiring_funnel_report():
    supabase = get_supabase()
    apps = (
        supabase.table("applications")
        .select("status, job_posting_id, job_postings(title)")
        .execute()
        .data
    )

    by_status: dict[str, int] = {}
    for a in apps:
        by_status[a["status"]] = by_status.get(a["status"], 0) + 1

    per_job: dict[str, dict] = {}
    for a in apps:
        title = (a.get("job_postings") or {}).get("title", "Unknown role")
        per_job.setdefault(title, {"title": title, "total": 0, "hired": 0})
        per_job[title]["total"] += 1
        if a["status"] == "hired":
            per_job[title]["hired"] += 1

    rows = list(per_job.values())
    for row in rows:
        row["conversion_rate"] = round(row["hired"] / row["total"] * 100, 1) if row["total"] else 0

    return {
        "total_applications": len(apps),
        "by_status": by_status,
        "by_job": sorted(rows, key=lambda r: -r["total"]),
    }


@router.get("/payroll-summary")
def payroll_summary_report():
    supabase = get_supabase()
    periods = (
        supabase.table("payroll_periods")
        .select("period_start, period_end, total_gross, total_net, status, outlets(name)")
        .order("period_start", desc=True)
        .limit(24)
        .execute()
        .data
    )

    by_outlet: dict[str, dict] = {}
    for p in periods:
        if p["status"] not in ("approved", "paid"):
            continue
        name = (p.get("outlets") or {}).get("name", "Unassigned")
        by_outlet.setdefault(name, {"outlet": name, "total_gross": 0.0, "total_net": 0.0, "periods": 0})
        by_outlet[name]["total_gross"] += float(p["total_gross"])
        by_outlet[name]["total_net"] += float(p["total_net"])
        by_outlet[name]["periods"] += 1

    return {
        "recent_periods": periods,
        "by_outlet": sorted(by_outlet.values(), key=lambda r: -r["total_net"]),
    }


@router.get("/turnover")
def turnover_report():
    supabase = get_supabase()
    staff = (
        supabase.table("staff")
        .select("status, hired_at, terminated_at")
        .execute()
        .data
    )

    active = sum(1 for s in staff if s["status"] == "active")
    terminated = [s for s in staff if s["status"] == "terminated" and s.get("terminated_at")]

    avg_tenure_days = None
    if terminated:
        total_days = 0
        counted = 0
        for s in terminated:
            if s.get("hired_at") and s.get("terminated_at"):
                hired = date.fromisoformat(s["hired_at"])
                left = date.fromisoformat(s["terminated_at"][:10])
                total_days += (left - hired).days
                counted += 1
        avg_tenure_days = round(total_days / counted) if counted else None

    return {
        "active_staff": active,
        "terminated_count": len(terminated),
        "turnover_rate_pct": round(len(terminated) / (active + len(terminated)) * 100, 1)
        if (active + len(terminated))
        else 0,
        "avg_tenure_days": avg_tenure_days,
    }


@router.get("/sales")
def sales_report():
    supabase = get_supabase()
    orders = (
        supabase.table("orders")
        .select("status, total, fulfillment_method, fulfillment_outlet_id, created_at, outlets(name)")
        .execute()
        .data
    )

    paid_statuses = {"payment_received", "confirmed", "ready_for_pickup", "out_for_delivery", "completed"}
    paid_orders = [o for o in orders if o["status"] in paid_statuses]

    total_revenue = sum(float(o["total"]) for o in paid_orders)
    by_outlet: dict[str, dict] = {}
    for o in paid_orders:
        name = (o.get("outlets") or {}).get("name", "Unassigned")
        by_outlet.setdefault(name, {"outlet": name, "orders": 0, "revenue": 0.0})
        by_outlet[name]["orders"] += 1
        by_outlet[name]["revenue"] += float(o["total"])

    by_method: dict[str, int] = {}
    for o in paid_orders:
        by_method[o["fulfillment_method"]] = by_method.get(o["fulfillment_method"], 0) + 1

    return {
        "total_orders": len(orders),
        "paid_orders": len(paid_orders),
        "total_revenue": total_revenue,
        "by_outlet": sorted(by_outlet.values(), key=lambda r: -r["revenue"]),
        "by_fulfillment_method": by_method,
    }