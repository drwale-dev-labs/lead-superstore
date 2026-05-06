from io import BytesIO
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.db import get_supabase
from app.schemas.verification import GuarantorCreate, ReferenceCreate

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
STORAGE_BUCKET = "verification-documents"


def _validate_staff_exists(supabase, staff_id: UUID) -> dict:
    result = supabase.table("staff").select("id, status").eq("id", str(staff_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return result.data[0]


async def _upload_document(file: UploadFile, staff_id: UUID, kind: str) -> tuple[str, str]:
    """Upload a verification document to Supabase Storage.

    Returns (storage_path, original_filename).
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or PDF.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    # Build a unique path: staff/{staff_id}/{kind}/{uuid}-{filename}
    safe_filename = file.filename or "document"
    storage_path = f"staff/{staff_id}/{kind}/{uuid4()}-{safe_filename}"

    supabase = get_supabase()
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path=storage_path,
        file=contents,
        file_options={"content-type": file.content_type},
    )

    return storage_path, safe_filename


# ============================================================================
# References
# ============================================================================


@router.get("/staff/{staff_id}/references")
def list_references(staff_id: UUID):
    """List all references for a staff member."""
    supabase = get_supabase()
    _validate_staff_exists(supabase, staff_id)

    response = (
        supabase.table("staff_references")
        .select("*")
        .eq("staff_id", str(staff_id))
        .order("collected_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "references": response.data}


@router.post("/staff/{staff_id}/references", status_code=status.HTTP_201_CREATED)
async def add_reference(
    staff_id: UUID,
    reference_type: str = Form(...),
    full_name: str = Form(...),
    phone: str = Form(...),
    relationship: str = Form(...),
    email: str | None = Form(None),
    organization: str | None = Form(None),
    note: str | None = Form(None),
    document: UploadFile | None = File(None),
):
    """Add a reference for a staff member, optionally with a document upload."""
    supabase = get_supabase()
    _validate_staff_exists(supabase, staff_id)

    # Validate the structured fields via our Pydantic schema
    payload = ReferenceCreate(
        reference_type=reference_type,
        full_name=full_name,
        phone=phone,
        email=email or None,
        organization=organization,
        relationship=relationship,
        note=note,
    )

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    insert_data["staff_id"] = str(staff_id)

    # Upload document if provided
    if document and document.filename:
        path, filename = await _upload_document(document, staff_id, "references")
        insert_data["document_path"] = path
        insert_data["document_filename"] = filename

    response = supabase.table("staff_references").insert(insert_data).execute()
    return response.data[0]


@router.delete("/references/{reference_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reference(reference_id: UUID):
    """Delete a reference (and its document if any)."""
    supabase = get_supabase()

    existing = (
        supabase.table("staff_references")
        .select("document_path")
        .eq("id", str(reference_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reference not found")

    # Delete document from storage if present
    doc_path = existing.data[0].get("document_path")
    if doc_path:
        supabase.storage.from_(STORAGE_BUCKET).remove([doc_path])

    supabase.table("staff_references").delete().eq("id", str(reference_id)).execute()
    return None


# ============================================================================
# Guarantors
# ============================================================================


@router.get("/staff/{staff_id}/guarantors")
def list_guarantors(staff_id: UUID):
    """List all guarantors for a staff member."""
    supabase = get_supabase()
    _validate_staff_exists(supabase, staff_id)

    response = (
        supabase.table("staff_guarantors")
        .select("*")
        .eq("staff_id", str(staff_id))
        .order("collected_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "guarantors": response.data}


@router.post("/staff/{staff_id}/guarantors", status_code=status.HTTP_201_CREATED)
async def add_guarantor(
    staff_id: UUID,
    full_name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    occupation: str = Form(...),
    relationship: str = Form(...),
    email: str | None = Form(None),
    id_type: str | None = Form(None),
    id_number: str | None = Form(None),
    note: str | None = Form(None),
    document: UploadFile | None = File(None),
):
    """Add a guarantor for a staff member, optionally with a signed guarantor form upload."""
    supabase = get_supabase()
    _validate_staff_exists(supabase, staff_id)

    payload = GuarantorCreate(
        full_name=full_name,
        phone=phone,
        email=email or None,
        address=address,
        occupation=occupation,
        relationship=relationship,
        id_type=id_type or None,
        id_number=id_number,
        note=note,
    )

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    insert_data["staff_id"] = str(staff_id)

    if document and document.filename:
        path, filename = await _upload_document(document, staff_id, "guarantors")
        insert_data["document_path"] = path
        insert_data["document_filename"] = filename

    response = supabase.table("staff_guarantors").insert(insert_data).execute()
    return response.data[0]


@router.delete("/guarantors/{guarantor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guarantor(guarantor_id: UUID):
    supabase = get_supabase()

    existing = (
        supabase.table("staff_guarantors")
        .select("document_path")
        .eq("id", str(guarantor_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    doc_path = existing.data[0].get("document_path")
    if doc_path:
        supabase.storage.from_(STORAGE_BUCKET).remove([doc_path])

    supabase.table("staff_guarantors").delete().eq("id", str(guarantor_id)).execute()
    return None


# ============================================================================
# Document download (signed URL)
# ============================================================================


@router.get("/documents/signed-url")
def get_signed_url(path: str, expires_in: int = 300):
    """Generate a short-lived signed URL for a stored document.

    Use this from the frontend to display/download a document without exposing
    the storage path or making the bucket public.
    """
    supabase = get_supabase()
    try:
        result = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(
            path=path, expires_in=expires_in
        )
        return {"url": result["signedURL"], "expires_in": expires_in}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Document not accessible: {str(e)}")


# ============================================================================
# Verification status
# ============================================================================


@router.get("/staff/{staff_id}/status")
def get_verification_status(staff_id: UUID):
    """Check whether a staff member meets the activation requirements."""
    supabase = get_supabase()
    staff = _validate_staff_exists(supabase, staff_id)

    refs = (
        supabase.table("staff_references")
        .select("id", count="exact")
        .eq("staff_id", str(staff_id))
        .execute()
    )
    guars = (
        supabase.table("staff_guarantors")
        .select("id", count="exact")
        .eq("staff_id", str(staff_id))
        .execute()
    )

    has_reference = bool(refs.data)
    has_guarantor = bool(guars.data)
    can_activate = has_reference and has_guarantor

    missing: list[str] = []
    if not has_reference:
        missing.append("reference")
    if not has_guarantor:
        missing.append("guarantor")

    return {
        "staff_id": str(staff_id),
        "current_status": staff["status"],
        "has_reference": has_reference,
        "has_guarantor": has_guarantor,
        "can_activate": can_activate,
        "missing": missing,
    }