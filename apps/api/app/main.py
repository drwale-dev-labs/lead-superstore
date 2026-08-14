from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.auth import require_hr_user
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import (
    ai_tools,
    applications,
    contracts,
    customers,
    deductions,
    jobs,
    orders,
    outlets,
    payments,
    payroll,
    products,
    reports,
    roles,
    staff,
    transfers,
    verification,
)

# Tag metadata controls the order and grouping in /docs.
# HR-only tags first, then public/e-commerce tags at the bottom.
TAGS_METADATA = [
    {"name": "Outlets", "description": "Outlets and warehouses. Used by both portals."},
    {"name": "Roles", "description": "HR — role directory."},
    {"name": "Staff", "description": "HR — staff records, onboarding, activation, soft delete."},
    {"name": "Verification", "description": "HR — staff references, guarantors, and document uploads."},
    {"name": "Transfers", "description": "HR — staff transfers between outlets and roles, with assignment history."},
    {"name": "Payroll", "description": "HR — salary structures, payroll periods, entries."},
    {"name": "Deductions", "description": "HR — loans, salary advances, fines."},
    {"name": "Contracts", "description": "HR — generate, edit, send employment contracts; upload signed copies."},
    {"name": "AI Tools", "description": "HR — Claude-powered content generation: job ads, aptitude tests, interview questions."},
    {"name": "Jobs (HR)", "description": "HR — manage job postings (draft → publish → close)."},
    {"name": "Applications (HR)", "description": "HR — review and progress applications."},
    {"name": "Careers (Public)", "description": "Public — careers page and apply form. Consumed by e-commerce."},
    {"name": "Products", "description": "Public — product catalog. Consumed by e-commerce."},
    {"name": "Orders", "description": "Public — order creation and lookup. Consumed by e-commerce checkout."},
    {"name": "Customers", "description": "Public — passwordless customer login (email code) and order history."},
    {"name": "Payments", "description": "Public — Paystack payment initialization, verification, and webhook."},
    {"name": "Orders (HR)", "description": "HR — view and progress customer orders (confirm, set delivery fee, mark ready/completed)."},
    {"name": "Reports", "description": "HR — headcount, hiring funnel, payroll, turnover, sales."},
]


app = FastAPI(
    title="Lead Superstore API",
    version="0.1.0",
    description=(
        "Backend API for Lead Superstore. Serves two frontends: the HR portal "
        "(internal) and the e-commerce platform (public). Endpoint tags indicate "
        "which frontend each route is intended for."
    ),
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.get("/health", tags=["Outlets"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# ============================================================================
# Public routers FIRST — so /public matches before /{job_id} in the admin router.
# Both jobs.public_router and jobs.admin_router mount at /api/jobs, so order matters.
# ============================================================================
app.include_router(jobs.public_router, prefix="/api/jobs", tags=["Careers (Public)"])
app.include_router(applications.public_router, prefix="/api/applications", tags=["Careers (Public)"])
app.include_router(orders.public_router, prefix="/api/orders", tags=["Orders"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])


# ============================================================================
# HR-only routers — gated behind a valid Supabase session (no role tiers;
# any logged-in HR user has full access). outlets.py stays public below —
# it's shared reference data the e-commerce app's outlet selector also needs.
# ============================================================================
_hr_auth = [Depends(require_hr_user)]
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"], dependencies=_hr_auth)
app.include_router(staff.router, prefix="/api/staff", tags=["Staff"], dependencies=_hr_auth)
app.include_router(verification.router, prefix="/api/verification", tags=["Verification"], dependencies=_hr_auth)
app.include_router(transfers.router, prefix="/api/transfers", tags=["Transfers"], dependencies=_hr_auth)
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"], dependencies=_hr_auth)
app.include_router(deductions.router, prefix="/api/deductions", tags=["Deductions"], dependencies=_hr_auth)
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"], dependencies=_hr_auth)
app.include_router(ai_tools.router, prefix="/api/ai", tags=["AI Tools"], dependencies=_hr_auth)
app.include_router(jobs.admin_router, prefix="/api/jobs", tags=["Jobs (HR)"], dependencies=_hr_auth)
app.include_router(applications.admin_router, prefix="/api/applications", tags=["Applications (HR)"], dependencies=_hr_auth)
app.include_router(orders.admin_router, prefix="/api/orders/admin", tags=["Orders (HR)"], dependencies=_hr_auth)
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"], dependencies=_hr_auth)

# Shared reference data — used by both the HR portal and the e-commerce
# app's outlet selector, which has no login of its own. Stays public.
app.include_router(outlets.router, prefix="/api/outlets", tags=["Outlets"])

# ============================================================================
# Public e-commerce
# ============================================================================
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])