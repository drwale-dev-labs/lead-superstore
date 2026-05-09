from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.db import get_supabase
from app.services.ai import generate_job_ad

router = APIRouter()


class GenerateJobAdRequest(BaseModel):
    role_id: str
    outlet_id: str
    employment_type: str = "Full-time"


class GenerateJobAdResponse(BaseModel):
    description: str
    role_name: str
    unit: str
    outlet_name: str


@router.post("/generate-job-ad", response_model=GenerateJobAdResponse)
def post_generate_job_ad(payload: GenerateJobAdRequest):
    """Generate a job advertisement using Claude.

    Pulls the role's responsibilities/requirements from the database and feeds
    them to Claude so the ad is grounded in the canonical role definition.
    """
    supabase = get_supabase()

    role_resp = supabase.table("roles").select("*").eq("id", payload.role_id).execute()
    if not role_resp.data:
        raise HTTPException(status_code=404, detail=f"Role '{payload.role_id}' not found")
    role = role_resp.data[0]

    outlet_resp = supabase.table("outlets").select("name").eq("id", payload.outlet_id).execute()
    if not outlet_resp.data:
        raise HTTPException(status_code=404, detail="Outlet not found")
    outlet_name = outlet_resp.data[0]["name"]

    try:
        description = generate_job_ad(
            role_name=role["name"],
            unit=role["unit"],
            outlet_name=outlet_name,
            role_description=role["description"] or "",
            responsibilities=[tuple(r) for r in (role["responsibilities"] or [])],
            requirements=role["requirements"] or [],
            employment_type=payload.employment_type,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"AI generation failed: {str(e)}"
        )

    return GenerateJobAdResponse(
        description=description,
        role_name=role["name"],
        unit=role["unit"],
        outlet_name=outlet_name,
    )