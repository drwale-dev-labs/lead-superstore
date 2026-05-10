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

class GenerateTestRequest(BaseModel):
    role_id: str
    num_questions: int = 10


class GenerateTestResponse(BaseModel):
    test: str
    role_name: str
    unit: str


@router.post("/generate-aptitude-test", response_model=GenerateTestResponse)
def post_generate_aptitude_test(payload: GenerateTestRequest):
    """Generate a role-tailored aptitude test using Claude."""
    supabase = get_supabase()

    role_resp = (
        supabase.table("roles").select("*").eq("id", payload.role_id).execute()
    )
    if not role_resp.data:
        raise HTTPException(status_code=404, detail=f"Role '{payload.role_id}' not found")
    role = role_resp.data[0]

    if payload.num_questions < 5 or payload.num_questions > 20:
        raise HTTPException(
            status_code=400, detail="num_questions must be between 5 and 20"
        )

    try:
        from app.services.ai import generate_aptitude_test
        test = generate_aptitude_test(
            role_name=role["name"],
            unit=role["unit"],
            role_description=role["description"] or "",
            responsibilities=[tuple(r) for r in (role["responsibilities"] or [])],
            requirements=role["requirements"] or [],
            num_questions=payload.num_questions,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")

    return GenerateTestResponse(
        test=test, role_name=role["name"], unit=role["unit"]
    )


class GenerateInterviewRequest(BaseModel):
    role_id: str


class GenerateInterviewResponse(BaseModel):
    questions: str
    role_name: str
    unit: str


@router.post(
    "/generate-interview-questions", response_model=GenerateInterviewResponse
)
def post_generate_interview_questions(payload: GenerateInterviewRequest):
    """Generate role-tailored interview questions for the hiring manager."""
    supabase = get_supabase()

    role_resp = (
        supabase.table("roles").select("*").eq("id", payload.role_id).execute()
    )
    if not role_resp.data:
        raise HTTPException(status_code=404, detail=f"Role '{payload.role_id}' not found")
    role = role_resp.data[0]

    try:
        from app.services.ai import generate_interview_questions
        questions = generate_interview_questions(
            role_name=role["name"],
            unit=role["unit"],
            role_description=role["description"] or "",
            responsibilities=[tuple(r) for r in (role["responsibilities"] or [])],
            requirements=role["requirements"] or [],
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")

    return GenerateInterviewResponse(
        questions=questions, role_name=role["name"], unit=role["unit"]
    )