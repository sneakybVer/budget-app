from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..db import get_session
from ..models import Account, FutureContribution

router = APIRouter(prefix="/future_contributions", tags=["contributions"])


@router.get("", response_model=List[FutureContribution])
def list_future(session: Session = Depends(get_session)):
    return session.exec(
        select(FutureContribution).order_by(FutureContribution.date)
    ).all()


@router.post("", response_model=FutureContribution)
def create_future(f: FutureContribution, session: Session = Depends(get_session)):
    if f.account_id:
        if not session.get(Account, f.account_id):
            raise HTTPException(status_code=404, detail="Account not found")

    # Upsert for recurring: remove any existing recurring entry for this account
    # to prevent duplicate accumulation of monthly totals.
    if f.recurring and f.account_id:
        existing = session.exec(
            select(FutureContribution).where(
                FutureContribution.account_id == f.account_id,
                FutureContribution.recurring == True,  # noqa: E712
            )
        ).all()
        for old in existing:
            session.delete(old)
        session.flush()

    session.add(f)
    session.commit()
    session.refresh(f)
    return f


@router.delete("/{contribution_id}", status_code=204)
def delete_future(contribution_id: int, session: Session = Depends(get_session)):
    f = session.get(FutureContribution, contribution_id)
    if not f:
        raise HTTPException(status_code=404, detail="Contribution not found")
    session.delete(f)
    session.commit()
