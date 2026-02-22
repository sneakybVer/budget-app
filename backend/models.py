from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import date


class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # historical value records
    values: List["ValueRecord"] = Relationship(back_populates="account")
    # future planned contributions
    future_contributions: List["FutureContribution"] = Relationship(back_populates="account")


class ValueRecord(SQLModel, table=True):
    """Represents a recorded current value for an account at a specific date.
    Use these as the historical series of account values (including deposits/interest).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="account.id")
    value: float
    date: date
    account: Optional[Account] = Relationship(back_populates="values")


class FutureContribution(SQLModel, table=True):
    """Represents planned future contributions.
    If `recurring` is True then `amount` is a monthly amount and `date` is the start date.
    If `recurring` is False then `date` is the one-off payment date and `amount` is the payment.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: Optional[int] = Field(default=None, foreign_key="account.id")
    amount: float
    # store optional scheduled date as ISO string to avoid SQLModel/date mapping issues
    date: Optional[str] = None
    recurring: bool = False
    account: Optional[Account] = Relationship(back_populates="future_contributions")


class AppSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    total_target: Optional[float] = None
