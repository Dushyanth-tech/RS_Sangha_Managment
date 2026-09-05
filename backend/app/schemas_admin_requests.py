from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AdminRequestCreate(BaseModel):
    sangha_id: int
    candidate_name: str
    candidate_email: str
    candidate_phone: str | None = None


class AdminRequestReject(BaseModel):
    reason: str


class AdminRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sangha_id: int
    sangha_name: str | None = None  # populate via a join in the router — see INTEGRATION NOTE
    requester_id: int
    candidate_name: str
    candidate_email: str
    candidate_phone: str | None
    status: str
    rejection_reason: str | None
    submitted_at: datetime
    reviewed_at: datetime | None
