from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase() -> Client:
    """Return a Supabase client authenticated with the service role key.

    Cached as a singleton so repeated calls (one per router function, per
    request) reuse the same client/HTTP connection pool instead of
    constructing a fresh one every time.

    Service role bypasses RLS — only call this from trusted server code.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)