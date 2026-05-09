"""Claude API integration for HR content generation."""

from anthropic import Anthropic

from app.core.config import settings

_client: Anthropic | None = None


def get_anthropic() -> Anthropic:
    """Lazy-initialised Anthropic client."""
    global _client
    if _client is None:
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        _client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def generate_job_ad(
    role_name: str,
    unit: str,
    outlet_name: str,
    role_description: str,
    responsibilities: list[tuple[str, str]],
    requirements: list[str],
    employment_type: str = "Full-time",
) -> str:
    """Generate a branded job advertisement using Claude.

    Returns the ad as a plain-text string with section labels in uppercase
    (no markdown headers). Suitable for direct display or copy-paste.
    """
    client = get_anthropic()

    resps_text = "\n".join(f"• {title}: {detail}" for title, detail in responsibilities)
    reqs_text = "\n".join(f"• {req}" for req in requirements)

    prompt = f"""Write a professional, engaging job advertisement for Lead Superstore — \
a chain of supermarkets, bakeries, and restaurants in Osun State, Nigeria. Use a warm, \
professional Nigerian business tone. Do NOT use markdown headers (#); use uppercase \
section labels instead.

Structure the ad with these sections in this order:
1. An eye-catching headline (single line)
2. A 2-3 sentence company hook about Lead Superstore
3. ROLE OVERVIEW (1-2 paragraphs)
4. KEY RESPONSIBILITIES (bullet list)
5. REQUIREMENTS (bullet list)
6. WHAT WE OFFER (3-4 bullets — competitive salary, growth, supportive team, etc.)
7. HOW TO APPLY (instruct candidates to apply via the careers page)

Role: {role_name}
Unit: {unit}
Outlet: {outlet_name}
Employment type: {employment_type}

Role description: {role_description}

Key responsibilities:
{resps_text}

Requirements:
{reqs_text}

Write the ad now. Output only the ad — no preamble, no explanations."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract text from the response
    text_blocks = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_blocks)