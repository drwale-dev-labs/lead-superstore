from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.db import get_supabase
from app.schemas.job import ApplicationCreate, ApplicationUpdate, InterviewScoreCreate
from app.services import email as email_service

APPLICATION_DOCUMENT_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_APPLICATION_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
APPLICATION_DOCUMENTS_BUCKET = "application-documents"

# ============================================================================
# HR-only router — review and progress applications
# ============================================================================

admin_router = APIRouter()


@admin_router.get("/")
def list_applications(
    job_posting_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    """List applications (HR inbox)."""
    supabase = get_supabase()
    query = supabase.table("applications").select(
        "*, job_postings(title, outlet_id, outlets(name))"
    )

    if job_posting_id:
        query = query.eq("job_posting_id", str(job_posting_id))
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.order("applied_at", desc=True).execute()
    return {"count": len(response.data), "applications": response.data}


@admin_router.get("/{application_id}/documents/signed-url")
def get_application_document_url(application_id: UUID, path: str, expires_in: int = 300):
    """Generate a short-lived signed URL for one of this application's documents.

    `path` must be one of the *_path values stored on the application row, so we
    only ever sign paths that genuinely belong to this application.
    """
    supabase = get_supabase()
    app_row = (
        supabase.table("applications")
        .select("cv_path, cover_letter_path, certificate_path, nysc_certificate_path")
        .eq("id", str(application_id))
        .execute()
    )
    if not app_row.data:
        raise HTTPException(status_code=404, detail="Application not found")

    valid_paths = {v for v in app_row.data[0].values() if v}
    if path not in valid_paths:
        raise HTTPException(status_code=404, detail="Document not found on this application")

    try:
        result = supabase.storage.from_(APPLICATION_DOCUMENTS_BUCKET).create_signed_url(
            path=path, expires_in=expires_in
        )
        return {"url": result["signedURL"], "expires_in": expires_in}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Document not accessible: {str(e)}")


@admin_router.get("/{application_id}")
def get_application(application_id: UUID):
    """Get a single application."""
    supabase = get_supabase()
    response = (
        supabase.table("applications")
        .select("*, job_postings(title, outlet_id, outlets(name))")
        .eq("id", str(application_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

    return response.data


@admin_router.patch("/{application_id}")
def update_application(application_id: UUID, payload: ApplicationUpdate):
    """Move application through the hiring pipeline.

    Moving to 'shortlisted' requires interview_scheduled_at + interview_location
    and auto-sends the shortlist email. Moving to 'hired' requires resume_date
    and auto-sends the hire email. Moving to 'rejected' auto-sends the rejection
    email. Email failures are surfaced as a 502 — the status change is not
    rolled back, since the DB write already succeeded; HR can see the status
    updated and retry notifying the candidate manually if needed.
    """
    supabase = get_supabase()

    if payload.status == "shortlisted" and (
        not payload.interview_scheduled_at or not payload.interview_location
    ):
        raise HTTPException(
            status_code=400,
            detail="interview_scheduled_at and interview_location are required to shortlist",
        )
    if payload.status == "hired" and not payload.resume_date:
        raise HTTPException(
            status_code=400, detail="resume_date is required to mark an applicant as hired"
        )

    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = (
        supabase.table("applications")
        .select("first_name, last_name, email, job_postings(title)")
        .eq("id", str(application_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    applicant = existing.data[0]
    applicant_name = f"{applicant['first_name']} {applicant['last_name']}"
    job_title = (applicant.get("job_postings") or {}).get("title", "the role")

    response = (
        supabase.table("applications")
        .update(update_data)
        .eq("id", str(application_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

    updated = response.data[0]

    try:
        if payload.status == "shortlisted":
            email_service.send_shortlisted_email(
                to_email=applicant["email"],
                applicant_name=applicant_name,
                job_title=job_title,
                interview_scheduled_at=updated["interview_scheduled_at"],
                interview_location=updated["interview_location"],
            )
        elif payload.status == "hired":
            email_service.send_hired_email(
                to_email=applicant["email"],
                applicant_name=applicant_name,
                job_title=job_title,
                resume_date=updated["resume_date"],
            )
        elif payload.status == "rejected":
            email_service.send_rejected_email(
                to_email=applicant["email"],
                applicant_name=applicant_name,
                job_title=job_title,
            )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Status updated, but the notification email failed to send: {str(e)}",
        )

    return updated


@admin_router.get("/{application_id}/interview-score")
def get_interview_score(application_id: UUID):
    """Fetch the interview score for an application, if one has been recorded."""
    supabase = get_supabase()
    response = (
        supabase.table("interview_scores")
        .select("*")
        .eq("application_id", str(application_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No interview score recorded yet")
    return response.data[0]


@admin_router.put("/{application_id}/interview-score")
def upsert_interview_score(application_id: UUID, payload: InterviewScoreCreate):
    """Record or update the interview score for an application."""
    supabase = get_supabase()

    app_check = (
        supabase.table("applications").select("id").eq("id", str(application_id)).execute()
    )
    if not app_check.data:
        raise HTTPException(status_code=404, detail="Application not found")

    existing = (
        supabase.table("interview_scores")
        .select("id")
        .eq("application_id", str(application_id))
        .execute()
    )

    data = payload.model_dump(mode="json", exclude_none=True)
    data["application_id"] = str(application_id)

    if existing.data:
        response = (
            supabase.table("interview_scores")
            .update(data)
            .eq("application_id", str(application_id))
            .execute()
        )
    else:
        response = supabase.table("interview_scores").insert(data).execute()

    return response.data[0]


# ============================================================================
# Public router — submit an application from the e-commerce careers page
# ============================================================================

public_router = APIRouter()


async def _upload_application_document(
    file: UploadFile, job_posting_id: UUID, kind: str
) -> tuple[str, str]:
    """Upload an application document to Supabase Storage.

    Returns (storage_path, original_filename).
    """
    if file.content_type not in APPLICATION_DOCUMENT_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or PDF.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(contents) > MAX_APPLICATION_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    safe_filename = (file.filename or "document").replace(" ", "_")
    storage_path = f"applications/{job_posting_id}/{kind}/{uuid4()}-{safe_filename}"

    supabase = get_supabase()
    try:
        supabase.storage.from_(APPLICATION_DOCUMENTS_BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    return storage_path, safe_filename


@public_router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_application(
    job_posting_id: UUID = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    cover_letter: str | None = Form(None),
    cv: UploadFile = File(...),
    cover_letter_file: UploadFile | None = File(None),
    certificate: UploadFile = File(...),
    nysc_certificate: UploadFile | None = File(None),
):
    """Submit an application. Public endpoint used by the careers page.

    Accepts multipart/form-data so candidates can attach a CV and certificate
    alongside the structured fields. CV and certificate are required; the NYSC
    certificate is optional. Cover letter can be pasted as text
    (`cover_letter`) or uploaded as a file (`cover_letter_file`) — one of the
    two is required.
    """
    if not cv.filename:
        raise HTTPException(status_code=400, detail="CV / resume is required")
    if not certificate.filename:
        raise HTTPException(status_code=400, detail="Certificate is required")
    if not (cover_letter and cover_letter.strip()) and not (
        cover_letter_file and cover_letter_file.filename
    ):
        raise HTTPException(
            status_code=400,
            detail="Cover letter is required — paste text or upload a file",
        )

    payload = ApplicationCreate(
        job_posting_id=job_posting_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        cover_letter=cover_letter or None,
    )

    supabase = get_supabase()

    # Verify the job is currently accepting applications
    job = (
        supabase.table("job_postings")
        .select("id, status, title")
        .eq("id", str(payload.job_posting_id))
        .execute()
    )
    if not job.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if job.data[0]["status"] != "published":
        raise HTTPException(
            status_code=400,
            detail="This job is not currently accepting applications",
        )

    # Prevent duplicate applications from the same email for the same job
    duplicate = (
        supabase.table("applications")
        .select("id")
        .eq("job_posting_id", str(payload.job_posting_id))
        .eq("email", payload.email)
        .execute()
    )
    if duplicate.data:
        raise HTTPException(
            status_code=409,
            detail="You have already applied for this position",
        )

    insert_data = payload.model_dump(mode="json", exclude_none=True)

    if cv and cv.filename:
        path, filename = await _upload_application_document(cv, payload.job_posting_id, "cv")
        insert_data["cv_path"] = path
        insert_data["cv_filename"] = filename

    if cover_letter_file and cover_letter_file.filename:
        path, filename = await _upload_application_document(
            cover_letter_file, payload.job_posting_id, "cover-letter"
        )
        insert_data["cover_letter_path"] = path
        insert_data["cover_letter_filename"] = filename

    if certificate and certificate.filename:
        path, filename = await _upload_application_document(
            certificate, payload.job_posting_id, "certificate"
        )
        insert_data["certificate_path"] = path
        insert_data["certificate_filename"] = filename

    if nysc_certificate and nysc_certificate.filename:
        path, filename = await _upload_application_document(
            nysc_certificate, payload.job_posting_id, "nysc-certificate"
        )
        insert_data["nysc_certificate_path"] = path
        insert_data["nysc_certificate_filename"] = filename

    response = supabase.table("applications").insert(insert_data).execute()
    return response.data[0]