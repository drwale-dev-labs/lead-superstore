"""Translate database-level errors into clean HTTP responses.

Postgres error codes:
  23505 — unique_violation
  23503 — foreign_key_violation
  23514 — check_violation
  23502 — not_null_violation
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

_PG_TO_HTTP: dict[str, tuple[int, str]] = {
    "23505": (409, "A record with these values already exists."),
    "23503": (400, "References a record that does not exist."),
    "23514": (400, "Value violates a database constraint."),
    "23502": (400, "Required field is missing."),
}


def register_error_handlers(app: FastAPI) -> None:
    """Wire DB-error translation into the FastAPI app."""

    @app.exception_handler(APIError)
    async def handle_postgrest_error(request: Request, exc: APIError) -> JSONResponse:
        code = getattr(exc, "code", None)
        mapping = _PG_TO_HTTP.get(code)

        if mapping:
            status_code, default_msg = mapping
            # Use Postgres details if present, else our default
            detail = getattr(exc, "details", None) or default_msg
            return JSONResponse(status_code=status_code, content={"detail": detail})

        # Unknown DB error — surface as 500 but log the details
        return JSONResponse(
            status_code=500,
            content={"detail": getattr(exc, "message", "Database error")},
        )