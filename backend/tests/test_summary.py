"""Tests for the /summary and /settings endpoints."""

import pytest


# ---------------------------------------------------------------------------
# GET /summary
# ---------------------------------------------------------------------------

def test_summary_empty_db(client):
    resp = client.get("/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0.0
    assert data["accounts"] == []
    # target is None when AppSettings row hasn't been created
    assert data["target"] is None


def test_summary_uses_latest_value_per_account(client):
    """
    /summary must pick the most-recent ValueRecord for each account,
    not the first or all of them.
    """
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]

    client.post("/values", json={"account_id": acct_id, "value": 7.0, "date": "2026-01-01"})
    client.post("/values", json={"account_id": acct_id, "value": 42.0, "date": "2026-02-01"})
    client.post("/values", json={"account_id": acct_id, "value": 69.0, "date": "2026-03-01"})

    data = client.get("/summary").json()
    acct_data = next(a for a in data["accounts"] if a["id"] == acct_id)
    assert acct_data["total"] == 69.0


def test_summary_total_aggregates_all_accounts(client):
    a1 = client.post("/accounts", json={"name": "ISA A"}).json()["id"]
    a2 = client.post("/accounts", json={"name": "ISA B"}).json()["id"]

    client.post("/values", json={"account_id": a1, "value": 42.0, "date": "2026-01-01"})
    client.post("/values", json={"account_id": a2, "value": 13.0, "date": "2026-01-01"})

    data = client.get("/summary").json()
    assert data["total"] == 55.0


def test_summary_account_with_no_values_contributes_zero(client):
    client.post("/accounts", json={"name": "Empty ISA"})

    data = client.get("/summary").json()
    assert data["total"] == 0.0
    assert data["accounts"][0]["total"] == 0.0


def test_summary_includes_target_from_settings(client):
    client.put("/settings", json={"total_target": 420.0})

    data = client.get("/summary").json()
    assert data["target"] == 420.0


def test_summary_includes_account_name_and_id(client):
    acct = client.post("/accounts", json={"name": "Named ISA"}).json()
    client.post("/values", json={"account_id": acct["id"], "value": 99.0, "date": "2026-01-01"})

    accts = client.get("/summary").json()["accounts"]
    match = next(a for a in accts if a["id"] == acct["id"])
    assert match["name"] == "Named ISA"
    assert match["total"] == 99.0


# ---------------------------------------------------------------------------
# GET /settings
# ---------------------------------------------------------------------------

def test_get_settings_creates_row_with_null_target_when_missing(client):
    resp = client.get("/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_target"] is None
    assert data["id"] is not None


def test_get_settings_idempotent(client):
    """Two consecutive calls return the same row without creating duplicates."""
    r1 = client.get("/settings").json()
    r2 = client.get("/settings").json()
    assert r1["id"] == r2["id"]


# ---------------------------------------------------------------------------
# PUT /settings
# ---------------------------------------------------------------------------

def test_update_settings_creates_row_if_not_exists(client):
    resp = client.put("/settings", json={"total_target": 420.0})
    assert resp.status_code == 200
    assert resp.json()["total_target"] == 420.0


def test_update_settings_updates_existing_value(client):
    client.put("/settings", json={"total_target": 7.0})
    resp = client.put("/settings", json={"total_target": 777.0})
    assert resp.json()["total_target"] == 777.0


def test_update_settings_only_one_row_exists(client):
    """Repeated PUTs must update the single row, not insert new ones."""
    client.put("/settings", json={"total_target": 7.0})
    client.put("/settings", json={"total_target": 420.0})
    client.put("/settings", json={"total_target": 999.0})

    # Verify the GET still returns a single object (not a list or error)
    resp = client.get("/settings")
    assert resp.status_code == 200
    assert resp.json()["total_target"] == 999.0
