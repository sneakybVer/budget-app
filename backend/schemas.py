from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    total_target: float


class AccountRename(BaseModel):
    name: str
