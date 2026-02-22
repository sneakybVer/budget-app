from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Account, AppSettings, ValueRecord
from ..schemas import SettingsUpdate

router = APIRouter(tags=["summary"])


@router.get("/summary")
def summary(session: Session = Depends(get_session)):
    """Return current total + per-account breakdown using the latest value records."""
    accounts = session.exec(select(Account)).all()
    total_all = 0.0
    per_account = []
    for a in accounts:
        latest = session.exec(
            select(ValueRecord)
            .where(ValueRecord.account_id == a.id)
            .order_by(ValueRecord.date.desc())
        ).first()
        val = latest.value if latest else 0.0
        total_all += val
        per_account.append({"id": a.id, "name": a.name, "total": val})

    settings = session.exec(select(AppSettings)).first()
    return {
        "total": total_all,
        "target": settings.total_target if settings else None,
        "accounts": per_account,
    }


@router.get("/settings", response_model=AppSettings)
def get_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(AppSettings)).first()
    if not settings:
        settings = AppSettings(total_target=None)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.put("/settings", response_model=AppSettings)
def update_settings(payload: SettingsUpdate, session: Session = Depends(get_session)):
    settings = session.exec(select(AppSettings)).first()
    if not settings:
        settings = AppSettings(total_target=payload.total_target)
        session.add(settings)
    else:
        settings.total_target = payload.total_target
        session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings
