import enum
from datetime import datetime, date
from sqlalchemy import Integer, String, ForeignKey, Boolean, Enum, DateTime, Text, func, Date, UniqueConstraint, LargeBinary
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

class NotificationType(str, enum.Enum):
    account_verification = "Account Verification"
    profile = "Profile"
    announcement = "Announcement"
    important = "Important"


class RecipientRule(str, enum.Enum):
    all_members = "All Members"
    incomplete_profile = "Members Without Completed Profile"
    missing_banking = "Members Without Banking Details"
    incomplete_profile_or_banking = "Members Without Completed Profile or Banking Details"


class NotificationStatus(str, enum.Enum):
    draft = "Draft"
    sent = "Sent"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fullname: Mapped[str] = mapped_column(String(50))
    username: Mapped[str] = mapped_column(String(30), unique=True)
    email: Mapped[str] = mapped_column(String(50), unique=True)
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password: Mapped[str] = mapped_column(String(255))

    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.member)
    isVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)

    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ---- ID Proof: Aadhaar or Passport ----
    id_proof_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    id_proof_number_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    id_proof_number_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    id_proof_image_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    id_proof_image_content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ---- PAN Card ----
    pan_number_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    pan_number_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    pan_image_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    pan_image_content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    otp: Mapped[str | None] = mapped_column(String(6), nullable=True)
    otp_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    creator: Mapped["User"] = relationship(remote_side=[id])

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

class BankDetails(Base):
    __tablename__ = "bank_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)

    account_number_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_holder_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(11), nullable=True)
    branch_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now(), nullable=True)
    
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    recipient: Mapped[RecipientRule] = mapped_column(Enum(RecipientRule), default=RecipientRule.all_members)
    message: Mapped[str] = mapped_column(Text)
    navigation_path: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON-encoded list of steps
    status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus), default=NotificationStatus.draft)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sangha_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of sangha ids; null/empty = All Sanghas


class NotificationRecipient(Base):
    """Snapshot of who actually received a notification, taken at send time."""
    __tablename__ = "notification_recipients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_id: Mapped[int] = mapped_column(ForeignKey("notifications.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint("notification_id", "user_id", name="uq_notification_recipient"),)