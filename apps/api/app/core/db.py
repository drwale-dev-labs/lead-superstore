from supabase import Client, create_client

from app.core.config import settings


def get_supabase() -> Client:
    """Return a Supabase client authenticated with the service role key.

    Service role bypasses RLS — only call this from trusted server code.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)