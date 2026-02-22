"""Tests for the /future_contributions router."""

import pytest


# ---------------------------------------------------------------------------
# GET /future_contributions
# ---------------------------------------------------------------------------

def test_list_contributions_empty(client):
    resp = client.get("/future_contributions")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /future_contributions
# ---------------------------------------------------------------------------

def test_create_one_off_contribution(client):
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]

    resp = client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 13.0, "date": "2026-04-01", "recurring": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] is not None
    assert data["account_id"] == acct_id
    assert data["amount"] == 13.0
    assert data["recurring"] is False


def test_create_unallocated_contribution_no_account(client):
    """A contribution with no account_id (unallocated lump sum) should be accepted."""
    resp = client.post(
        "/future_contributions",
        json={"amount": 42.0, "date": "2026-05-01", "recurring": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["account_id"] is None
    assert data["amount"] == 42.0


def test_create_contribution_unknown_account_returns_404(client):
    resp = client.post(
        "/future_contributions",
        json={"account_id": 99999, "amount": 7.0, "recurring": False},
    )
    assert resp.status_code == 404


def test_create_contribution_appears_in_list(client):
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]
    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 69.0, "date": "2026-03-01", "recurring": False},
    )

    items = client.get("/future_contributions").json()
    assert len(items) == 1
    assert items[0]["amount"] == 69.0


# ---------------------------------------------------------------------------
# Recurring upsert behaviour
# ---------------------------------------------------------------------------

def test_recurring_contribution_upserts_replacing_existing(client):
    """
    Posting a second recurring contribution for the same account must replace the
    first — not accumulate a duplicate — so monthly totals aren't double-counted.
    """
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]

    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 7.0, "date": "2026-01-01", "recurring": True},
    )
    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 42.0, "date": "2026-01-01", "recurring": True},
    )

    recurring = [
        c for c in client.get("/future_contributions").json()
        if c["recurring"] and c["account_id"] == acct_id
    ]
    assert len(recurring) == 1, "Expected exactly one recurring entry after upsert"
    assert recurring[0]["amount"] == 42.0


def test_recurring_upsert_does_not_remove_one_off_contributions(client):
    """Recurring upsert must only replace other recurring entries, not one-off ones."""
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]

    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 13.0, "date": "2026-02-01", "recurring": False},
    )
    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 7.0, "date": "2026-01-01", "recurring": True},
    )

    all_contribs = client.get("/future_contributions").json()
    acct_contribs = [c for c in all_contribs if c["account_id"] == acct_id]
    assert len(acct_contribs) == 2  # one-off and recurring both present


def test_recurring_contributions_for_different_accounts_are_independent(client):
    """Recurring upsert for account A must not affect account B's recurring entry."""
    a1 = client.post("/accounts", json={"name": "ISA A"}).json()["id"]
    a2 = client.post("/accounts", json={"name": "ISA B"}).json()["id"]

    client.post(
        "/future_contributions",
        json={"account_id": a1, "amount": 42.0, "date": "2026-01-01", "recurring": True},
    )
    client.post(
        "/future_contributions",
        json={"account_id": a2, "amount": 13.0, "date": "2026-01-01", "recurring": True},
    )
    # Upsert a1's recurring
    client.post(
        "/future_contributions",
        json={"account_id": a1, "amount": 69.0, "date": "2026-01-01", "recurring": True},
    )

    all_recurring = [c for c in client.get("/future_contributions").json() if c["recurring"]]
    assert len(all_recurring) == 2  # one per account

    a2_recurring = [c for c in all_recurring if c["account_id"] == a2]
    assert a2_recurring[0]["amount"] == 13.0  # untouched


# ---------------------------------------------------------------------------
# DELETE /future_contributions/{id}
# ---------------------------------------------------------------------------

def test_delete_contribution_returns_204(client):
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]
    contrib_id = client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 7.0, "recurring": False},
    ).json()["id"]

    resp = client.delete(f"/future_contributions/{contrib_id}")
    assert resp.status_code == 204


def test_delete_contribution_removes_it_from_list(client):
    acct_id = client.post("/accounts", json={"name": "My ISA"}).json()["id"]
    contrib_id = client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 7.0, "recurring": False},
    ).json()["id"]

    client.delete(f"/future_contributions/{contrib_id}")

    ids = [c["id"] for c in client.get("/future_contributions").json()]
    assert contrib_id not in ids


def test_delete_contribution_not_found_returns_404(client):
    resp = client.delete("/future_contributions/99999")
    assert resp.status_code == 404
