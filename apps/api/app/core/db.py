from functools import lru_cache

import httpx
from supabase import Client, ClientOptions, create_client

from app.core.config import settings


@lru_cache
def get_supabase() -> Client:
    """Return a Supabase client authenticated with the service role key.

    Cached as a singleton so repeated calls (one per router function, per
    request) reuse the same client/HTTP connection pool instead of
    constructing a fresh one every time.

    The underlying httpx client is given a short keepalive expiry and
    automatic retries on connection-level failures — a long-lived pooled
    connection can get silently closed by Supabase's edge (idle timeout,
    load balancer recycling), and without this the very next request to
    reuse it fails with httpcore.RemoteProtocolError / ConnectionTerminated
    instead of transparently retrying on a fresh connection.

    Service role bypasses RLS — only call this from trusted server code.
    """
    httpx_client = httpx.Client(
        transport=httpx.HTTPTransport(retries=3),
        limits=httpx.Limits(keepalive_expiry=10.0),
        timeout=httpx.Timeout(30.0),
    )
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
        options=ClientOptions(httpx_client=httpx_client),
    )