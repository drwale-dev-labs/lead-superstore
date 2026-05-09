from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import (
    ai_tools,
    applications,
    deductions,
    jobs,
    outlets,
    payroll,
    products,
    roles,
    staff,
    transfers,        # ← add
    verification,
)

# Tag metadata controls the order and grouping in /docs.
# HR-only tags first, then public/e-commerce tags at the bottom.
TAGS_METADATA = [
    {"name": "Outlets", "description": "Outlets and warehouses. Used by both portals."},
    {"name": "Roles", "description": "HR — role directory."},
    {"name": "Staff", "description": "HR — staff records, onboarding, activation, soft delete."},
    {"name": "Payroll", "description": "HR — salary structures, payroll periods, entries."},
    {"name": "Deductions", "description": "HR — loans, salary advances, fines."},
    {"name": "Jobs (HR)", "description": "HR — manage job postings (draft → publish → close)."},
    {"name": "Applications (HR)", "description": "HR — review and progress applications."},
    {"name": "Careers (Public)", "description": "Public — careers page and apply form. Consumed by e-commerce."},
    {"name": "Products", "description": "Public — product catalog. Consumed by e-commerce."},
    {"name": "Verification", "description": "HR — staff references, guarantors, and document uploads."},
    {"name": "Transfers", "description": "HR — staff transfers between outlets and roles, with assignment history."},
    {"name": "AI Tools", "description": "HR — Claude-powered content generation: job ads, aptitude tests, interview questions."},
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.get("/health", tags=["Outlets"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# HR-only routers
app.include_router(outlets.router, prefix="/api/outlets", tags=["Outlets"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff"])
app.include_router(verification.router, prefix="/api/verification", tags=["Verification"])
app.include_router(transfers.router, prefix="/api/transfers", tags=["Transfers"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])
app.include_router(deductions.router, prefix="/api/deductions", tags=["Deductions"])
app.include_router(ai_tools.router, prefix="/api/ai", tags=["AI Tools"])

# Job postings: HR-side admin endpoints
app.include_router(jobs.admin_router, prefix="/api/jobs", tags=["Jobs (HR)"])

# Applications: HR-side review endpoints
app.include_router(applications.admin_router, prefix="/api/applications", tags=["Applications (HR)"])

# Public / careers bridge — what the e-commerce careers page consumes
app.include_router(jobs.public_router, prefix="/api/jobs", tags=["Careers (Public)"])
app.include_router(applications.public_router, prefix="/api/applications", tags=["Careers (Public)"])

# Public / e-commerce
app.include_router(products.router, prefix="/api/products", tags=["Products"])