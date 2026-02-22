"""
Shared pytest fixtures for the budget-app backend test suite.

Each test gets its own isolated, empty, in-memory SQLite database.
The production seed() is patched out so tests always start clean.
"""

import pytest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine


@pytest.fixture()
def client():
    """
    Yield a FastAPI TestClient backed by a fresh in-memory SQLite engine.

    Steps:
      1. Create a fresh in-memory engine using StaticPool (single connection,
         stable across the test without needing teardown close calls).
      2. Create all tables via SQLModel.metadata.
      3. Patch backend.db.engine so every router/lifespan call hits the test DB.
      4. Override the get_session dependency to use the same test engine.
      5. Patch seed() to a no-op so tests start with an empty database.
      6. Restore everything after each test.
    """
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)

    import backend.db as db_module
    from backend.main import app
    from backend.db import get_session

    original_engine = db_module.engine
    db_module.engine = test_engine

    def override_get_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with patch("backend.seed.seed"):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()
    db_module.engine = original_engine
