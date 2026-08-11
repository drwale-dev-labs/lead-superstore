from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.db import get_supabase
from app.schemas.job import ApplicationCreate, ApplicationUpdate

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
    """Move application through the hiring pipeline."""
    supabase = get_supabase()

    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("applications")
        .update(update_data)
        .eq("id", str(application_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

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