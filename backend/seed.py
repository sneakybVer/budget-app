from sqlmodel import Session, select

from .db import engine
from .models import AppSettings


def seed():
    """Create the AppSettings row with defaults if it does not already exist.

    All accounts, values, and contributions are configured by the user through
    the Settings page — no personal data is baked into the codebase.
    """
    with Session(engine) as session:
        if not session.exec(select(AppSettings)).first():
            session.add(AppSettings(total_target=None))
            session.commit()
