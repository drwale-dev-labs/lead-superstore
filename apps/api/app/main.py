from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    applications,
    deductions,           # ← add
    jobs,
    outlets,
    payroll,
    products,
    roles,
    staff,
)

app = FastAPI(
    title="Lead Superstore API",
    version="0.1.0",
    description="Backend API for Lead Superstore HR portal and e-commerce platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


app.include_router(outlets.router, prefix="/api/outlets", tags=["Outlets"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(deductions.router, prefix="/api/deductions", tags=["Deductions"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])