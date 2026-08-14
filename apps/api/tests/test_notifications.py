"""Tests for claim_and_notify — the shared idempotent claim-then-notify
helper used by both order-confirmed (payments.py) and order-completed
(orders.py) SMS notifications, extracted to remove their duplication.
"""

from app.services.notifications import claim_and_notify


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeTable:
    """Minimal Supabase query-builder stand-in: chainable, always returns
    the same canned data regardless of which filters were applied.
    """

    def __init__(self, data):
        self._data = data

    def update(self, *args, **kwargs):
        return self

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def is_(self, *args, **kwargs):
        return self

    def execute(self):
        return _FakeResult(self._data)


class _FakeSupabase:
    def __init__(self, claim_succeeds: bool, customer: dict, outlet: dict):
        self._claim_succeeds = claim_succeeds
        self._customer = customer
        self._outlet = outlet

    def table(self, name: str):
        if name == "orders":
            return _FakeTable([{"id": "order-1"}] if self._claim_succeeds else [])
        if name == "customers":
            return _FakeTable([self._customer] if self._customer else [])
        if name == "outlets":
            return _FakeTable([self._outlet] if self._outlet else [])
        raise AssertionError(f"unexpected table: {name}")


ORDER = {
    "id": "order-1",
    "customer_id": "cust-1",
    "fulfillment_outlet_id": "outlet-1",
    "order_number": "LS-2026-00099",
}


def test_sends_when_claim_succeeds_and_phone_present():
    supabase = _FakeSupabase(
        claim_succeeds=True,
        customer={"first_name": "Ada", "phone": "08000000000"},
        outlet={"name": "Test Outlet"},
    )
    calls = []
    claim_and_notify(supabase, ORDER, "confirmation_sms_sent_at", lambda c, o: calls.append((c, o)))

    assert len(calls) == 1
    assert calls[0][0]["phone"] == "08000000000"
    assert calls[0][1]["name"] == "Test Outlet"


def test_does_not_send_when_claim_already_taken():
    # Simulates a second concurrent request (e.g. webhook + browser callback)
    # losing the race — the conditional update affects 0 rows.
    supabase = _FakeSupabase(
        claim_succeeds=False,
        customer={"first_name": "Ada", "phone": "08000000000"},
        outlet={"name": "Test Outlet"},
    )
    calls = []
    claim_and_notify(supabase, ORDER, "confirmation_sms_sent_at", lambda c, o: calls.append((c, o)))

    assert calls == []


def test_does_not_send_when_customer_has_no_phone():
    supabase = _FakeSupabase(
        claim_succeeds=True,
        customer={"first_name": "Ada", "phone": None},
        outlet={"name": "Test Outlet"},
    )
    calls = []
    claim_and_notify(supabase, ORDER, "confirmation_sms_sent_at", lambda c, o: calls.append((c, o)))

    assert calls == []


def test_send_failure_is_swallowed_not_raised():
    supabase = _FakeSupabase(
        claim_succeeds=True,
        customer={"first_name": "Ada", "phone": "08000000000"},
        outlet={"name": "Test Outlet"},
    )

    def failing_send(customer, outlet):
        raise RuntimeError("SMS provider down")

    # Must not raise — a notification failure should never surface to the caller.
    claim_and_notify(supabase, ORDER, "confirmation_sms_sent_at", failing_send)
