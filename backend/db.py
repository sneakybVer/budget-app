from sqlmodel import create_engine, SQLModel, Session
from typing import Generator
import os

DATABASE_URL = os.getenv("BUDGET_DATABASE_URL", "sqlite:///./budget.db")

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
