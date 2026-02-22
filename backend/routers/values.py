from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..db import get_session
from ..models import Account, ValueRecord

router = APIRouter(prefix="/values", tags=["values"])


@router.get("", response_model=List[ValueRecord])
def list_values(session: Session = Depends(get_session)):
    return session.exec(select(ValueRecord).order_by(ValueRecord.date)).all()


@router.post("", response_model=ValueRecord)
def create_value(value: ValueRecord, session: Session = Depends(get_session)):
    if not session.get(Account, value.account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    session.add(value)
    session.commit()
    session.refresh(value)
    return value


@router.delete("/{value_id}", status_code=204)
def delete_value(value_id: int, session: Session = Depends(get_session)):
    v = session.get(ValueRecord, value_id)
    if not v:
        raise HTTPException(status_code=404, detail="Value record not found")
    session.delete(v)
    session.commit()
