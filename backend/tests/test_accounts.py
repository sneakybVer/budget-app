"""Tests for the /accounts router."""

import pytest


# ---------------------------------------------------------------------------
# GET /accounts
# ---------------------------------------------------------------------------

def test_list_accounts_empty(client):
    resp = client.get("/accounts")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_accounts_returns_created_accounts(client):
    client.post("/accounts", json={"name": "ISA Alpha"})
    client.post("/accounts", json={"name": "ISA Beta"})

    resp = client.get("/accounts")
    assert resp.status_code == 200

    names = [a["name"] for a in resp.json()]
    assert "ISA Alpha" in names
    assert "ISA Beta" in names
    assert len(names) == 2


# ---------------------------------------------------------------------------
# POST /accounts
# ---------------------------------------------------------------------------

def test_create_account_returns_account_with_id(client):
    resp = client.post("/accounts", json={"name": "My ISA"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My ISA"
    assert data["id"] is not None


def test_create_multiple_accounts_have_distinct_ids(client):
    r1 = client.post("/accounts", json={"name": "Account A"})
    r2 = client.post("/accounts", json={"name": "Account B"})
    assert r1.json()["id"] != r2.json()["id"]


# ---------------------------------------------------------------------------
# DELETE /accounts/{id}
# ---------------------------------------------------------------------------

def test_delete_account_returns_204(client):
    acct_id = client.post("/accounts", json={"name": "Temp Account"}).json()["id"]

    resp = client.delete(f"/accounts/{acct_id}")
    assert resp.status_code == 204


def test_delete_account_removes_it_from_list(client):
    acct_id = client.post("/accounts", json={"name": "Doomed Account"}).json()["id"]
    client.delete(f"/accounts/{acct_id}")

    ids = [a["id"] for a in client.get("/accounts").json()]
    assert acct_id not in ids


def test_delete_account_not_found_returns_404(client):
    resp = client.delete("/accounts/99999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Cascade: deleting an account removes its value records and contributions
# ---------------------------------------------------------------------------

def test_delete_account_cascades_value_records(client):
    acct_id = client.post("/accounts", json={"name": "Cascade ISA"}).json()["id"]
    client.post("/values", json={"account_id": acct_id, "value": 42.0, "date": "2026-01-01"})

    client.delete(f"/accounts/{acct_id}")

    values = client.get("/values").json()
    assert all(v["account_id"] != acct_id for v in values)


def test_delete_account_cascades_contributions(client):
    acct_id = client.post("/accounts", json={"name": "Cascade ISA"}).json()["id"]
    client.post(
        "/future_contributions",
        json={"account_id": acct_id, "amount": 69.0, "recurring": False},
    )

    client.delete(f"/accounts/{acct_id}")

    contribs = client.get("/future_contributions").json()
    assert all(c["account_id"] != acct_id for c in contribs)


# ---------------------------------------------------------------------------
# PATCH /accounts/{id}  (rename)
# ---------------------------------------------------------------------------

def test_rename_account_returns_updated_account(client):
    acct_id = client.post("/accounts", json={"name": "Old Name"}).json()["id"]

    resp = client.patch(f"/accounts/{acct_id}", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["id"] == acct_id


def test_rename_account_persists_in_list(client):
    acct_id = client.post("/accounts", json={"name": "Before"}).json()["id"]
    client.patch(f"/accounts/{acct_id}", json={"name": "After"})

    names = [a["name"] for a in client.get("/accounts").json()]
    assert "After" in names
    assert "Before" not in names


def test_rename_account_not_found_returns_404(client):
    resp = client.patch("/accounts/99999", json={"name": "Ghost"})
    assert resp.status_code == 404
