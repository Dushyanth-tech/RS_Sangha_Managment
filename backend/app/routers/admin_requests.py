# INTEGRATION NOTE
# ------------------------------------------------------------------
# Adjust these imports to match your project layout. Assumed to exist:
#   - get_db()                      -> yields a DB session
#   - get_current_user(...)         -> dependency returning the logged-in User
#   - User model with .id, .role, .email  ("superadmin" | "admin" | "subadmin" | "member")
#   - Sangha model with .id, .name, .admin_id (nullable)
#   - RequestStatus enum with .pending / .approved / .rejected
# Mount with: app.include_router(admin_requests.router)
# ------------------------------------------------------------------

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# from ..database import get_db
# from ..auth import get_current_user
# from ..models import User, Sangha, RequestStatus
# from ..models_admin_requests import AdminPromotionRequest
# from ..schemas_admin_requests import AdminRequestCreate, AdminRequestReject, AdminRequestOut

router = APIRouter(prefix="/admin-requests", tags=["admin-requests"])


def require_role(*roles):
    def _dep(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return current_user
    return _dep


def _serialize(req: "AdminPromotionRequest", db: Session) -> dict:
    """Attach the sangha's name for display — adjust if you'd rather do this with a join/relationship."""
    sangha = db.query(Sangha).filter(Sangha.id == req.sangha_id).first()
    return {**req.__dict__, "sangha_name": sangha.name if sangha else None}


@router.post("", response_model=AdminRequestOut)
def create_admin_request(
    payload: AdminRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """An admin proposes someone to become the admin of a sangha that has none yet."""
    sangha = db.query(Sangha).filter(Sangha.id == payload.sangha_id).first()
    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha not found")
    if sangha.admin_id is not None:
        raise HTTPException(status_code=400, detail="This sangha already has an admin")

    req = AdminPromotionRequest(
        sangha_id=payload.sangha_id,
        requester_id=current_user.id,
        candidate_name=payload.candidate_name,
        candidate_email=payload.candidate_email,
        candidate_phone=payload.candidate_phone,
        status=RequestStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize(req, db)


@router.get("", response_model=list[AdminRequestOut])
def list_admin_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Superadmin sees every request; an admin sees only the ones they submitted."""
    query = db.query(AdminPromotionRequest)
    if current_user.role == "admin":
        query = query.filter(AdminPromotionRequest.requester_id == current_user.id)
    requests = query.order_by(AdminPromotionRequest.submitted_at.desc()).all()
    return [_serialize(r, db) for r in requests]


@router.patch("/{request_id}/approve", response_model=AdminRequestOut)
def approve_admin_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    req = db.query(AdminPromotionRequest).filter(AdminPromotionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    sangha = db.query(Sangha).filter(Sangha.id == req.sangha_id).first()
    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha no longer exists")
    if sangha.admin_id is not None:
        raise HTTPException(status_code=400, detail="This sangha already has an admin")

    # Find or create the candidate's account, then promote + assign.
    candidate = db.query(User).filter(User.email == req.candidate_email).first()
    if not candidate:
        candidate = User(
            name=req.candidate_name,
            email=req.candidate_email,
            phone=req.candidate_phone,
            role="admin",
        )
        db.add(candidate)
        db.flush()  # get candidate.id before assigning it below
        # NOTE: your real User model likely needs a password/OTP/invite step here —
        # this creates a bare account; wire in whatever your signup flow requires.
    else:
        candidate.role = "admin"

    sangha.admin_id = candidate.id
    req.status = RequestStatus.approved
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(req)
    return _serialize(req, db)


@router.patch("/{request_id}/reject", response_model=AdminRequestOut)
def reject_admin_request(
    request_id: int,
    payload: AdminRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    req = db.query(AdminPromotionRequest).filter(AdminPromotionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    req.status = RequestStatus.rejected
    req.rejection_reason = payload.reason
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(req)
    return _serialize(req, db)
