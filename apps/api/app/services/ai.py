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

def generate_aptitude_test(
    role_name: str,
    unit: str,
    role_description: str,
    responsibilities: list[tuple[str, str]],
    requirements: list[str],
    num_questions: int = 10,
) -> str:
    """Generate a role-specific aptitude test using Claude.

    Returns a plain-text test with numbered questions, multiple-choice answers,
    and a separate ANSWER KEY section at the bottom. No markdown headers.
    """
    client = get_anthropic()

    resps_text = "\n".join(f"• {title}: {detail}" for title, detail in responsibilities)
    reqs_text = "\n".join(f"• {req}" for req in requirements)

    prompt = f"""Create a practical aptitude test for candidates applying to be a \
{role_name} at Lead Superstore — a chain of supermarkets, bakeries, and restaurants \
in Osun State, Nigeria. The test should genuinely measure whether someone can do this \
job, not generic IQ-style trivia.

Tailor questions to the actual responsibilities below. Mix question types:
- Numerical reasoning grounded in real scenarios (e.g. cash handling, change calculation, \
inventory math) — but only if relevant to the role
- Situational judgment: "What would you do if…" with 4 plausible answers
- Role-specific knowledge: only if it's basic and learnable, not specialist
- Customer service scenarios where applicable

Use Nigerian context: Naira (₦), local product names, realistic SME scenarios. \
Keep language simple and direct — many candidates will be secondary-school graduates.

Output format:
- Header: "APTITUDE TEST — {role_name.upper()}" (single line)
- 1-line instructions including the time recommendation
- Numbered questions, each with options labeled A/B/C/D
- Blank line between questions
- At the bottom, a section labeled "ANSWER KEY" with the correct letter for each question \
and a 1-sentence justification

Role: {role_name}
Unit: {unit}

Role description: {role_description}

Key responsibilities:
{resps_text}

Requirements:
{reqs_text}

Generate exactly {num_questions} questions. Output only the test — no preamble."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    text_blocks = [b.text for b in response.content if hasattr(b, "text")]
    return "\n".join(text_blocks)


def generate_interview_questions(
    role_name: str,
    unit: str,
    role_description: str,
    responsibilities: list[tuple[str, str]],
    requirements: list[str],
) -> str:
    """Generate role-specific interview questions for the hiring manager."""
    client = get_anthropic()

    resps_text = "\n".join(f"• {title}: {detail}" for title, detail in responsibilities)
    reqs_text = "\n".join(f"• {req}" for req in requirements)

    prompt = f"""Generate a structured set of interview questions a Lead Superstore \
hiring manager can use when interviewing a candidate for the {role_name} role.

Lead Superstore is a Nigerian SME — supermarket, bakery, restaurant chain in Osun State. \
Interviewers are unit managers, not HR specialists. Questions should be:
- Direct and easy to ask out loud
- Grounded in the actual work, not corporate jargon
- A mix that probes: experience, role-specific competence, situational judgment, \
character/integrity, and motivation/fit
- Aware of local context (cost of living, family commitments, transport realities)

Group questions under these uppercase section labels (no markdown):
1. WARM-UP & BACKGROUND (3-4 questions)
2. EXPERIENCE & SKILLS (4-5 questions tailored to this role)
3. SITUATIONAL & SCENARIO QUESTIONS (3-4 — give realistic Lead Superstore scenarios)
4. CHARACTER & INTEGRITY (3 questions — important in a high-cash retail environment)
5. MOTIVATION & FIT (2-3 questions)

For each section, after the questions, add a short italics-style note in parentheses \
like "(Look for: …)" describing what a strong vs weak answer sounds like. Keep notes \
brief — one line.

Role: {role_name}
Unit: {unit}

Role description: {role_description}

Key responsibilities:
{resps_text}

Requirements:
{reqs_text}

Output only the question set — no preamble."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    text_blocks = [b.text for b in response.content if hasattr(b, "text")]
    return "\n".join(text_blocks)