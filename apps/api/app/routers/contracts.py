import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from uuid import UUID, uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from xhtml2pdf import pisa

from app.core.db import get_supabase
from app.schemas.contracts import ContractUpdate
from app.services import contracts as contracts_service
from app.services import email as email_service

router = APIRouter()
logger = logging.getLogger(__name__)

STORAGE_BUCKET = "staff-contracts"
ALLOWED_UPLOAD_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _get_active_staff_with_salary(supabase, staff_id: UUID) -> dict:
    staff_resp = (
        supabase.table("staff")
        .select(
            "*, outlets(name, address, city, state), "
            "roles(name, unit, description, responsibilities)"
        )
        .eq("id", str(staff_id))
        .execute()
    )
    if not staff_resp.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff = staff_resp.data[0]

    if staff["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail="A contract can only be generated for an active staff member",
        )

    structures = (
        supabase.table("salary_structures")
        .select("gross_salary, effective_to")
        .eq("staff_id", str(staff_id))
        .order("effective_from", desc=True)
        .execute()
    )
    current = next(
        (s for s in structures.data if s["effective_to"] is None), None
    )
    if not current:
        raise HTTPException(
            status_code=400,
            detail="This staff member has no current salary set — set a salary before generating a contract",
        )

    staff["gross_salary"] = current["gross_salary"]
    return staff


@router.get("/signed-url")
def get_contract_signed_url(path: str, expires_in: int = 300):
    """Short-lived signed URL for viewing/downloading a stored contract file."""
    supabase = get_supabase()
    try:
        result = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(
            path=path, expires_in=expires_in
        )
        return {"url": result["signedURL"], "expires_in": expires_in}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Document not accessible: {str(e)}")


@router.get("/staff/{staff_id}")
def list_contracts(staff_id: UUID):
    supabase = get_supabase()
    response = (
        supabase.table("staff_contracts")
        .select("*")
        .eq("staff_id", str(staff_id))
        .order("created_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "contracts": response.data}


@router.post("/staff/{staff_id}/generate", status_code=status.HTTP_201_CREATED)
def generate_contract(staff_id: UUID):
    """Generate a new draft contract for an active staff member with a salary set.

    Pulls role, salary, and (if eligible) training bond terms live; the rest
    is boilerplate. HR can freely edit the result before sending — this is
    a starting point, not a final document.
    """
    supabase = get_supabase()
    staff = _get_active_staff_with_salary(supabase, staff_id)

    role = staff.get("roles") or {}
    outlet = staff.get("outlets") or {}
    staff_name = f"{staff['first_name']} {staff['last_name']}"
    hired_at = date.fromisoformat(staff["hired_at"]) if staff.get("hired_at") else date.today()

    content_html = contracts_service.generate_contract_html(
        staff_name=staff_name,
        role_name=role.get("name", "Staff"),
        role_responsibilities=role.get("responsibilities"),
        unit=role.get("unit", ""),
        outlet_name=outlet.get("name", "Lead Superstore"),
        outlet_address=outlet.get("address"),
        outlet_city=outlet.get("city"),
        outlet_state=outlet.get("state"),
        hired_at=hired_at,
        gross_salary=Decimal(str(staff["gross_salary"])),
    )

    inserted = (
        supabase.table("staff_contracts")
        .insert(
            {
                "staff_id": str(staff_id),
                "content_html": content_html,
                "status": "draft",
            }
        )
        .execute()
    )
    return inserted.data[0]


@router.patch("/staff/{staff_id}/{contract_id}")
def update_contract(staff_id: UUID, contract_id: UUID, payload: ContractUpdate):
    """Edit a draft contract's content before sending."""
    supabase = get_supabase()

    existing = (
        supabase.table("staff_contracts")
        .select("status")
        .eq("id", str(contract_id))
        .eq("staff_id", str(staff_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    if existing.data[0]["status"] != "draft":
        raise HTTPException(
            status_code=400, detail="Only a draft contract can be edited"
        )

    response = (
        supabase.table("staff_contracts")
        .update(
            {
                "content_html": payload.content_html,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(contract_id))
        .execute()
    )
    return response.data[0]


@router.post("/staff/{staff_id}/{contract_id}/send")
def send_contract(staff_id: UUID, contract_id: UUID):
    """Render the current draft to PDF, email it to the staff member, and
    mark it sent. Only a draft can be sent — HR reviews/edits first.
    """
    supabase = get_supabase()

    contract_resp = (
        supabase.table("staff_contracts")
        .select("*")
        .eq("id", str(contract_id))
        .eq("staff_id", str(staff_id))
        .execute()
    )
    if not contract_resp.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract = contract_resp.data[0]
    if contract["status"] != "draft":
        raise HTTPException(status_code=400, detail="This contract has already been sent")

    staff_resp = (
        supabase.table("staff").select("first_name, last_name, email").eq(
            "id", str(staff_id)
        ).execute()
    )
    if not staff_resp.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff = staff_resp.data[0]
    if not staff.get("email"):
        raise HTTPException(
            status_code=400, detail="This staff member has no email on file"
        )
    staff_name = f"{staff['first_name']} {staff['last_name']}"

    pdf_buffer = BytesIO()
    pisa_result = pisa.CreatePDF(contract["content_html"], dest=pdf_buffer)
    if pisa_result.err:
        raise HTTPException(status_code=500, detail="Failed to render contract to PDF")
    pdf_bytes = pdf_buffer.getvalue()

    filename = f"{staff_name.replace(' ', '_')}_contract.pdf"
    storage_path = f"staff/{staff_id}/contracts/{uuid4()}-{filename}"

    try:
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    try:
        email_service.send_contract_email(
            to_email=staff["email"],
            staff_name=staff_name,
            pdf_bytes=pdf_bytes,
            filename=filename,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Contract saved, but sending the email failed: {str(e)}",
        )

    response = (
        supabase.table("staff_contracts")
        .update(
            {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "pdf_path": storage_path,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(contract_id))
        .execute()
    )
    return response.data[0]


@router.post("/staff/{staff_id}/{contract_id}/upload-signed")
async def upload_signed_contract(
    staff_id: UUID, contract_id: UUID, file: UploadFile = File(...)
):
    """HR uploads the scanned/photographed signed copy once it's returned."""
    supabase = get_supabase()

    existing = (
        supabase.table("staff_contracts")
        .select("status")
        .eq("id", str(contract_id))
        .eq("staff_id", str(staff_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    if existing.data[0]["status"] not in ("sent", "signed"):
        raise HTTPException(
            status_code=400,
            detail="This contract must be sent before a signed copy can be uploaded",
        )

    if file.content_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or PDF.",
        )
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    safe_filename = (file.filename or "signed-contract").replace(" ", "_")
    storage_path = f"staff/{staff_id}/contracts/signed/{uuid4()}-{safe_filename}"

    try:
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    response = (
        supabase.table("staff_contracts")
        .update(
            {
                "status": "signed",
                "signed_copy_path": storage_path,
                "signed_uploaded_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(contract_id))
        .execute()
    )
    return response.data[0]
