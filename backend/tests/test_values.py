"""Tests for the /values router."""

import pytest


# ---------------------------------------------------------------------------
# GET /values
# ---------------------------------------------------------------------------

def test_list_values_empty(client):
    resp = client.get("/values")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_values_ordered_by_date(client):
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]

    client.post("/values", json={"account_id": acct_id, "value": 69.0, "date": "2026-03-01"})
    client.post("/values", json={"account_id": acct_id, "value": 7.0, "date": "2026-01-01"})
    client.post("/values", json={"account_id": acct_id, "value": 42.0, "date": "2026-02-01"})

    dates = [v["date"] for v in client.get("/values").json()]
    assert dates == sorted(dates)


# ---------------------------------------------------------------------------
# POST /values
# ---------------------------------------------------------------------------

def test_create_value_returns_record_with_id(client):
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]

    resp = client.post(
        "/values",
        json={"account_id": acct_id, "value": 13.0, "date": "2026-01-01"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] is not None
    assert data["account_id"] == acct_id
    assert data["value"] == 13.0
    assert data["date"] == "2026-01-01"


def test_create_value_unknown_account_returns_404(client):
    resp = client.post(
        "/values",
        json={"account_id": 99999, "value": 7.0, "date": "2026-01-01"},
    )
    assert resp.status_code == 404


def test_create_value_appears_in_list(client):
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]
    client.post("/values", json={"account_id": acct_id, "value": 42.0, "date": "2026-06-01"})

    values = client.get("/values").json()
    assert len(values) == 1
    assert values[0]["value"] == 42.0


# ---------------------------------------------------------------------------
# DELETE /values/{id}
# ---------------------------------------------------------------------------

def test_delete_value_returns_204(client):
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]
    value_id = client.post(
        "/values", json={"account_id": acct_id, "value": 13.0, "date": "2026-01-01"}
    ).json()["id"]

    resp = client.delete(f"/values/{value_id}")
    assert resp.status_code == 204


def test_delete_value_removes_it_from_list(client):
    acct_id = client.post("/accounts", json={"name": "Test ISA"}).json()["id"]
    value_id = client.post(
        "/values", json={"account_id": acct_id, "value": 13.0, "date": "2026-01-01"}
    ).json()["id"]

    client.delete(f"/values/{value_id}")

    ids = [v["id"] for v in client.get("/values").json()]
    assert value_id not in ids


def test_delete_value_not_found_returns_404(client):
    resp = client.delete("/values/99999")
    assert resp.status_code == 404
