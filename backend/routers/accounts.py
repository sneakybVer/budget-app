from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..db import get_session
from ..models import Account, FutureContribution, ValueRecord
from ..schemas import AccountRename

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=List[Account])
def list_accounts(session: Session = Depends(get_session)):
    return session.exec(select(Account)).all()


@router.post("", response_model=Account)
def create_account(account: Account, session: Session = Depends(get_session)):
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: int, session: Session = Depends(get_session)):
    acct = session.get(Account, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    for v in session.exec(select(ValueRecord).where(ValueRecord.account_id == account_id)).all():
        session.delete(v)
    for f in session.exec(select(FutureContribution).where(FutureContribution.account_id == account_id)).all():
        session.delete(f)
    session.delete(acct)
    session.commit()


@router.patch("/{account_id}", response_model=Account)
def rename_account(account_id: int, payload: AccountRename, session: Session = Depends(get_session)):
    acct = session.get(Account, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct.name = payload.name
    session.add(acct)
    session.commit()
    session.refresh(acct)
    return acct
