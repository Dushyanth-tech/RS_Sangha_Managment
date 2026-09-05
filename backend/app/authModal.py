import enum
from datetime import datetime, date
from sqlalchemy import Integer, String, ForeignKey, Boolean, Enum, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.dbconnection import Base


class Role(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    subadmin = "subadmin"
    member = "member"


class RequestStatus(str, enum.Enum):
    pending = "PENDING"
    approved = "APPROVED"
    rejected = "REJECTED"
    not_submitted = "NOT_SUBMITTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fullname: Mapped[str] = mapped_column(String(50))
    username: Mapped[str] = mapped_column(String(30), unique=True)
    email: Mapped[str] = mapped_column(String(50), unique=True)
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    aadhar_number: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password: Mapped[str] = mapped_column(String(255))          # hashed

    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.member)
    isVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)

    otp: Mapped[str | None] = mapped_column(String(6), nullable=True)
    otp_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Who created/invited this account (superadmin->admin, admin->subadmin/member, etc.)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    creator: Mapped["User"] = relationship(remote_side=[id])

    # Meaningful only for role=member or role=subadmin — the sangha they belong to / manage
    sangha_id: Mapped[int | None] = mapped_column(ForeignKey("sanghas.id"), nullable=True)
    sangha: Mapped["Sanghas"] = relationship(
        back_populates="members", foreign_keys=[sangha_id]
    )


class Sanghas(Base):
    __tablename__ = "sanghas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(7),unique=True,nullable=True)  # e.g. "RS042429"
    name: Mapped[str] = mapped_column(String(50), unique=True)
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(20))
    state: Mapped[str] = mapped_column(String(20))
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    membersCount: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))            # superadmin or admin
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"))              # must have role=admin
    subadmin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), unique=True, nullable=True)

    members: Mapped[list["User"]] = relationship(
        back_populates="sangha", foreign_keys="User.sangha_id"
    )


class SubAdminRequest(Base):
    """Pending request for a member to become a sangha's subadmin — the approval workflow itself."""
    __tablename__ = "subadmin_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sangha_id: Mapped[int] = mapped_column(ForeignKey("sanghas.id"))
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"))     # reviewer
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"))  # the member requesting/proposed

    # Snapshot of submitted details (kept even if the user later edits their profile)
    subadmin_name: Mapped[str] = mapped_column(String(50))
    subadmin_email: Mapped[str] = mapped_column(String(50))
    subadmin_phone: Mapped[str] = mapped_column(String(15))
    address: Mapped[str] = mapped_column(String(255))
    aadhar_number: Mapped[str] = mapped_column(String(20))
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience: Mapped[str | None] = mapped_column(Text, nullable=True)
    qualifications: Mapped[str | None] = mapped_column(Text, nullable=True)
    availability: Mapped[str | None] = mapped_column(String(100), nullable=True)
    additional_info: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), default=RequestStatus.pending)
    rejection_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SubAdminActivityLog(Base):
    __tablename__ = "subadmin_activity_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subadmin_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))
    performed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # 45 = IPv6-safe