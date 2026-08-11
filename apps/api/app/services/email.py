"""Resend integration for applicant-facing transactional emails."""

import resend

from app.core.config import settings

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    if not _configured:
        resend.api_key = settings.RESEND_API_KEY
        _configured = True


def _send(to_email: str, subject: str, html: str) -> None:
    _ensure_configured()
    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM_ADDRESS,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
    )


def send_shortlisted_email(
    *,
    to_email: str,
    applicant_name: str,
    job_title: str,
    interview_scheduled_at: str,
    interview_location: str,
) -> None:
    """Notify an applicant they've been shortlisted for an interview."""
    subject = f"You've been shortlisted — {job_title} at Lead Superstore"
    html = f"""
    <p>Dear {applicant_name},</p>
    <p>Thank you for applying for the <strong>{job_title}</strong> role at Lead Superstore.
    We're pleased to let you know you've been shortlisted for an interview.</p>
    <p><strong>Interview details:</strong><br>
    Date/time: {interview_scheduled_at}<br>
    Location: {interview_location}</p>
    <p>Please come prepared and arrive on time. If you have any questions or need to
    reschedule, reply to this email.</p>
    <p>Best regards,<br>Lead Superstore HR Team</p>
    """
    _send(to_email, subject, html)


def send_hired_email(
    *,
    to_email: str,
    applicant_name: str,
    job_title: str,
    resume_date: str,
) -> None:
    """Notify an applicant they've been successful and give their resumption date."""
    subject = f"Congratulations — your application for {job_title} was successful"
    html = f"""
    <p>Dear {applicant_name},</p>
    <p>Congratulations! We're pleased to let you know your application for the
    <strong>{job_title}</strong> role at Lead Superstore was successful.</p>
    <p>You are expected to resume on <strong>{resume_date}</strong>. Our HR team will
    be in touch with further onboarding details.</p>
    <p>We look forward to welcoming you to the team.</p>
    <p>Best regards,<br>Lead Superstore HR Team</p>
    """
    _send(to_email, subject, html)


def send_rejected_email(
    *,
    to_email: str,
    applicant_name: str,
    job_title: str,
) -> None:
    """Notify an applicant their application was not successful."""
    subject = f"Update on your application — {job_title} at Lead Superstore"
    html = f"""
    <p>Dear {applicant_name},</p>
    <p>Thank you for taking the time to apply for the <strong>{job_title}</strong> role
    at Lead Superstore and for interviewing with our team.</p>
    <p>After careful consideration, we have decided not to move forward with your
    application at this time. This was a competitive process and does not reflect
    on your qualifications.</p>
    <p>We encourage you to apply again for future roles that match your experience.</p>
    <p>Best regards,<br>Lead Superstore HR Team</p>
    """
    _send(to_email, subject, html)
