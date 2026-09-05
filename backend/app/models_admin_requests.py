# INTEGRATION NOTE
# ------------------------------------------------------------------
# Paste this class into your existing models.py (next to SubAdminRequest).
# It assumes the following already exist in models.py — reconcile names
# if yours differ:
#   - Base                (declarative base, from database.py)
#   - RequestStatus        (Enum: pending / approved / rejected — same one
#                            SubAdminRequest already uses)
#   - users table / User model with an `id` PK, `role`, `email` columns
#   - sanghas table / Sangha model with a nullable `admin_id`
# ------------------------------------------------------------------

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

# from .database import Base
# from .models import RequestStatus  # reuse the enum already defined for SubAdminRequest


class AdminPromotionRequest(Base):
    """
    An admin proposing a person to become the admin of a sangha that
    currently has none (admin_id IS NULL). Goes to the superadmin's
    request queue for approval — mirrors the SubAdminRequest approval
    workflow, one level up the hierarchy.

    The candidate doesn't need to be an existing user — approval will
    create their account if one doesn't already exist for their email.
    """
    __tablename__ = "admin_promotion_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    sangha_id: Mapped[int] = mapped_column(ForeignKey("sanghas.id"))    # the adminless sangha
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"))   # admin proposing
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # superadmin

    # Candidate details as submitted — may or may not match an existing user yet
    candidate_name: Mapped[str] = mapped_column(String(50))
    candidate_email: Mapped[str] = mapped_column(String(50))
    candidate_phone: Mapped[str | None] = mapped_column(String(15), nullable=True)

    status: Mapped["RequestStatus"] = mapped_column(Enum(RequestStatus), default=RequestStatus.pending)
    rejection_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
