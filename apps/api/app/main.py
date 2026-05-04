from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import outlets

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