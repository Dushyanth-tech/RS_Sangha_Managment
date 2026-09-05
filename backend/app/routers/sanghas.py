# INTEGRATION NOTE
# ------------------------------------------------------------------
# If you already have a /sanghas router for the superadmin dashboard,
# merge this in rather than mounting both — the goal is ONE set of
# endpoints that both superadmin and admin hit, scoped by role:
#   - superadmin: sees / creates for any admin (admin_id optional/nullable)
#   - admin:      sees only sanghas where admin_id == self; creating one
#                 auto-assigns admin_id = self
# Assumed to exist: get_db, get_current_user, User, Sangha, SanghaMember
# (or however members are modeled — adjust add_member accordingly).
# ------------------------------------------------------------------

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

# from ..database import get_db
# from ..auth import get_current_user
# from ..models import User, Sangha, SanghaMember
from .admin_requests import require_role

router = APIRouter(tags=["sanghas"])


class SanghaCreate(BaseModel):
    name: str
    code: str
    description: str | None = None


class MemberCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None


@router.get("/sanghas/unassigned")
def list_unassigned_sanghas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Sanghas with no admin yet — the pool an admin can propose themselves/others into."""
    return db.query(Sangha).filter(Sangha.admin_id.is_(None)).all()


@router.get("/sanghas")
def list_sanghas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    query = db.query(Sangha)
    if current_user.role == "admin":
        query = query.filter(Sangha.admin_id == current_user.id)
    return query.all()


@router.post("/sanghas")
def create_sangha(
    payload: SanghaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    sangha = Sangha(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        # superadmin can create an unassigned sangha (admin_id stays nullable);
        # an admin creating one always owns it.
        admin_id=current_user.id if current_user.role == "admin" else None,
    )
    db.add(sangha)
    db.commit()
    db.refresh(sangha)
    return sangha


@router.post("/sanghas/{sangha_id}/members")
def add_member(
    sangha_id: int,
    payload: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    sangha = db.query(Sangha).filter(Sangha.id == sangha_id).first()
    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha not found")
    if current_user.role == "admin" and sangha.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't manage this sangha")

    member = SanghaMember(
        sangha_id=sangha_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    members_count = db.query(SanghaMember).filter(SanghaMember.sangha_id == sangha_id).count()
    return {"member": member, "membersCount": members_count}


@router.get("/sanghas/{sangha_id}/members")
def list_members(
    sangha_id: int,
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """List members of a sangha (e.g. to display/manage them)."""
    sangha = db.query(Sangha).filter(Sangha.id == sangha_id).first()
    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha not found")
    if current_user.role == "admin" and sangha.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't manage this sangha")

    query = db.query(SanghaMember).filter(SanghaMember.sangha_id == sangha_id)
    if search:
        query = query.filter(SanghaMember.name.ilike(f"%{search}%"))
    return query.all()
