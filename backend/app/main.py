from app.crypto import encrypt_value, decrypt_value, mask_last4, encrypt_bytes, decrypt_bytes, hash_value
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
# from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from app.authSchema import NewUser, LoginUser, NewSanghas, Search, AdminRequestCreate,AddAdminRequest,RemoveSanghasPayload,SanghaUpdate, ProfileWizardUpdate, NotificationCreate, ClearNotificationsRequest
from app.authModal import User, Sanghas, SubAdminRequest, RequestStatus, BankDetails, Notification, NotificationRecipient
from app.dbconnection import get_db, engine, Base
from app.auth import create_access_token, hash_password, verify_password, get_current_user
from sqlalchemy import or_,func, select
from sqlalchemy.orm import aliased, Session
from datetime import datetime, timezone
import re
import json
import os, uuid

app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

UPLOAD_DIR = "uploads/profile_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/overview")
def get_overview_stats(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(
        User.id == int(current_user_id)
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Only superadmin can view overview stats."
        )

    total_admins = db.scalar(
        select(func.count(User.id)).where(
            User.role == "admin"
        )
    )

    total_sanghas = db.scalar(
        select(func.count(Sanghas.id))
    )

    total_members = db.query(User).filter(
        User.role == "member"
    ).count()

    # Verified members
    verified_members = db.query(User).filter(
        User.role == "member",
        User.isVerified == True
    ).count()

    # Unverified members
    unverified_members = db.query(User).filter(
        User.role == "member",
        User.isVerified == False
    ).count()

    pending_requests = db.scalar(
        select(func.count(SubAdminRequest.id)).where(
            SubAdminRequest.status == "pending"
        )
    )

    return {
        "totalAdmins": total_admins or 0,
        "totalSanghas": total_sanghas or 0,
        "pendingRequests": pending_requests or 0,
        "totalMembers": total_members or 0,
        "verifiedMembers": verified_members or 0,
        "unverifiedMembers": unverified_members or 0,
    }

@app.post("/auth/register")
def register_user(user: NewUser, db = Depends(get_db)):
    # Check if the email already exists in the database
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create a new user instance
    new_user = User(
        fullname=user.fullname,
        username=user.username,
        email=user.email,
        phone=user.phone,
        password=hash_password(user.password),  # Hash the password before storing it
    )

    # Add the new user to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}

@app.post("/auth/login")
def login_user(
    user:LoginUser,
    db=Depends(get_db)
):
    db_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    if not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "sub": str(db_user.id),
        "email": db_user.email,
        "role": db_user.role
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "fullname": db_user.fullname,
            "email": db_user.email,
            "role": db_user.role
        }
    }

@app.post("/sanghas")
def create_sangha(
    sangha: NewSanghas,
    db=Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role == "admin":
        admin_id = current_user.id            # self-assign, ignore payload
    elif current_user.role == "superadmin":
        admin_id = sangha.admin_id             # superadmin may leave unassigned or assign anyone
    else:
        raise HTTPException(status_code=403, detail="Only admin and superadmin can create a sangha.")

    new_sangha = Sanghas(
        name=sangha.name,
        address=sangha.address,
        city=sangha.city,
        state=sangha.state,
        isActive=True,
        membersCount=0,
        created_by=current_user.id,
        admin_id=admin_id,
        subadmin_id=None
    )
    db.add(new_sangha)
    db.commit()
    db.refresh(new_sangha)

    new_sangha.code = f"RS{new_sangha.id:05d}"
    db.commit()
    db.refresh(new_sangha)

    return new_sangha

@app.get("/sanghas")
def list_sanghas(db=Depends(get_db), current_user_id=Depends(get_current_user)):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    admin = aliased(User)
    subadmin = aliased(User)

    query = (
        db.query(
            Sanghas,
            admin.fullname.label("admin_name"),
            subadmin.fullname.label("subadmin_name"),
        )
        .outerjoin(admin, Sanghas.admin_id == admin.id)
        .outerjoin(subadmin, Sanghas.subadmin_id == subadmin.id)
    )

    if current_user.role == "admin":
        query = query.filter(Sanghas.admin_id == current_user.id)
    # superadmin: no filter, sees all

    rows = query.all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "admin_id": s.admin_id,
            "admin_name": admin_name,
            "subadmin_id": s.subadmin_id,
            "subadmin_name": subadmin_name,
            "membersCount": s.membersCount,
        }
        for s, admin_name, subadmin_name in rows
    ]


@app.get("/member/my-sangha")
def get_my_sangha(
    db=Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(
        User.id == int(current_user_id)
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    if current_user.role != "member":
        raise HTTPException(
            status_code=403,
            detail="Only members can access this endpoint."
        )

    if current_user.sangha_id is None:
        return []

    admin = aliased(User)

    result = (
        db.query(
            Sanghas,
            admin.fullname.label("admin_name")
        )
        .outerjoin(admin, Sanghas.admin_id == admin.id)
        .filter(Sanghas.id == current_user.sangha_id)
        .first()
    )

    if not result:
        return []

    sangha, admin_name = result

    return [{
        "id": sangha.id,
        "code": sangha.code,
        "name": sangha.name,
        "address": sangha.address,
        "city": sangha.city,
        "state": sangha.state,
        "admin_name": admin_name,
        "membersCount": sangha.membersCount
    }]

@app.get("/member/my-sangha/members")
def get_my_sangha_members(
    db=Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(
        User.id == int(current_user_id)
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    if current_user.role != "member":
        raise HTTPException(
            status_code=403,
            detail="Only members can access this endpoint."
        )

    if current_user.sangha_id is None:
        return []

    members = (
        db.query(User)
        .filter(
            User.sangha_id == current_user.sangha_id,
            User.role == "member"
        )
        .order_by(User.fullname.asc())
        .all()
    )

    return [
        {
            "id": member.id,
            "name": member.fullname,
            "address": member.address,
            "is_current_user": member.id == current_user.id
        }
        for member in members
    ]
@app.post("/sanghas/{sangha_id}/members")
def add_member(
    sangha_id: int,
    payload: dict,  # {"member_id": int}
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    member_id = payload.get("member_id")
    sangha = db.query(Sanghas).filter(Sanghas.id == sangha_id).first()
    if not sangha:
        raise HTTPException(404, "Sangha not found")

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(404, "User not found")

    if member.sangha_id is not None:
        raise HTTPException(
            400,
            "User already belongs to a sangha"
            if member.sangha_id != sangha_id
            else "User is already a member of this sangha"
        )

    member.sangha_id = sangha_id
    sangha.membersCount += 1
    db.commit()

    return {"detail": "Member added", "membersCount": sangha.membersCount}

@app.get("/users/search")
def search_members(
    q: str = "",
    role: str = "member",
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin and superadmin can search users."
        )

    roles = [r.strip() for r in role.split(",") if r.strip()]

    query = db.query(User).filter(User.role.in_(roles))

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.fullname.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
            )
        )

    results = query.limit(20).all()

    sangha_ids = {u.sangha_id for u in results if u.sangha_id is not None}
    sangha_names = {}
    if sangha_ids:
        sangha_names = {
            s.id: s.name
            for s in db.query(Sanghas).filter(Sanghas.id.in_(sangha_ids)).all()
        }

    return [
        {
            "id": u.id,
            "name": u.fullname,
            "email": u.email,
            "phone": u.phone,
            "isActive": u.isActive,
            "role": u.role,
            "sanghaId": u.sangha_id,
            "sanghaName": sangha_names.get(u.sangha_id) if u.sangha_id else None,
        }
        for u in results
    ]

@app.get("/admins")
def list_admins(db=Depends(get_db), current_user_id=Depends(get_current_user)):
    rows = (
        db.query(
            User.id,
            User.fullname,
            User.email,
            User.isActive,
            func.count(Sanghas.id).label("sangha_count"),
        )
        .outerjoin(Sanghas, Sanghas.admin_id == User.id)
        .filter(User.role == "admin")
        .group_by(User.id)
        .all()
    )

    return [
        {
            "id": r.id,
            "name": r.fullname,
            "email": r.email,
            "sanghaCount": r.sangha_count,
            "status": "active" if r.isActive else "inactive",
        }
        for r in rows
    ]


@app.post("/admins")
def add_admin(
    payload: AddAdminRequest,
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Only superadmin can assign admins."
        )

    # Find selected member/admin
    member = db.query(User).filter(
        User.id == payload.member_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="User not found")

    # User must be a member OR an existing admin (to allow multi-sangha admins)
    if member.role not in ("member", "admin"):
        raise HTTPException(
            status_code=400,
            detail="User is not eligible for promotion"
        )

    # Find selected Sangha
    sangha = db.query(Sanghas).filter(
        Sanghas.id == payload.sangha_id
    ).first()

    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha not found")

    if sangha.admin_id is not None:
        raise HTTPException(
            status_code=400,
            detail="This Sangha already has an admin"
        )

    # --------------------------------
    # UPDATE USERS TABLE
    # --------------------------------

    member.role = "admin"
    # No member.sangha_id assignment — an admin's sanghas are derived from
    # Sanghas.admin_id (one-to-many), not stored on the User row.

    # --------------------------------
    # UPDATE SANGHAS TABLE
    # --------------------------------

    sangha.admin_id = member.id

    db.commit()
    db.refresh(member)
    db.refresh(sangha)

    return {
        "id": member.id,
        "name": member.fullname,
        "email": member.email,
        "role": member.role,
        "status": "active" if member.isActive else "inactive",

        "sanghaId": sangha.id,
        "sanghaName": sangha.name,
        "sanghaAdminId": sangha.admin_id,
    }

@app.delete("/admins/{admin_id}")
def remove_admin(
    admin_id: int,
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(404, "Admin not found")

    # Unassign this admin from every sangha they currently manage
    unassigned_count = (
        db.query(Sanghas)
        .filter(Sanghas.admin_id == admin_id)
        .update({Sanghas.admin_id: None})
    )

    admin.role = "member"
    db.commit()

    return {
        "detail": "Admin removed",
        "sanghas_unassigned": unassigned_count,
    }

@app.delete("/sanghas/{sangha_id}/members/{member_id}")
def remove_member(
    sangha_id: int,
    member_id: int,
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    sangha = db.query(Sanghas).filter(Sanghas.id == sangha_id).first()
    if not sangha:
        raise HTTPException(404, "Sangha not found")

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(404, "User not found")

    if member.sangha_id != sangha_id:
        raise HTTPException(400, "User is not a member of this sangha")

    member.sangha_id = None
    if sangha.membersCount > 0:
        sangha.membersCount -= 1
    db.commit()

    return {"detail": "Member removed", "membersCount": sangha.membersCount}

@app.get("/admins/{admin_id}/sanghas")
def get_admin_sanghas(
    admin_id: int,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can view an admin's sanghas.")

    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    sanghas = db.query(Sanghas).filter(Sanghas.admin_id == admin_id).all()

    return [{"id": s.id, "name": s.name} for s in sanghas]


@app.delete("/admins/{admin_id}/sanghas")
def remove_admin_from_sanghas(
    admin_id: int,
    payload: RemoveSanghasPayload,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can remove an admin from sanghas.")

    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    sanghas_to_update = db.query(Sanghas).filter(
        Sanghas.id.in_(payload.sangha_ids),
        Sanghas.admin_id == admin_id
    ).all()

    for sangha in sanghas_to_update:
        sangha.admin_id = None

    db.flush()  # make the unassignments visible to the count query below

    remaining_count = db.query(Sanghas).filter(Sanghas.admin_id == admin_id).count()

    demoted = False
    if remaining_count == 0:
        admin.role = "member"
        demoted = True

    db.commit()

    return {
        "detail": "Admin unassigned from selected sanghas",
        "sanghas_unassigned": len(sanghas_to_update),
        "demoted_to_member": demoted
    }

@app.get("/sanghas/{sangha_id}/members")
def list_sangha_members(
    sangha_id: int,
    q: str = "",
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    sangha = db.query(Sanghas).filter(Sanghas.id == sangha_id).first()
    if not sangha:
        raise HTTPException(404, "Sangha not found")

    query = db.query(User).filter(
        User.sangha_id == sangha_id,
        User.role == "member",
    )

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.fullname.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
            )
        )

    members = query.all()

    return [
        {"id": m.id, "name": m.fullname, "email": m.email, "phone": m.phone}
        for m in members
    ]

@app.get("/admin/members")
def get_members_for_admin(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    # Get actual logged-in user
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin and superadmin can access this."
        )

    members = (
        db.query(User)
        .filter(User.role == "member")
        .all()
    )

    return [
        {
            "id": member.id,
            "name": member.fullname,
            "email": member.email,
            "phone": member.phone,
            "address": member.address,
        }
        for member in members
    ]

@app.get("/sanghas/unassigned")
def get_unassigned_sanghas(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin and superadmin can access this."
        )

    sanghas = (
        db.query(Sanghas)
        .filter(Sanghas.admin_id.is_(None))
        .all()
    )

    return [
        {
            "id": sangha.id,
            "name": sangha.name
        }
        for sangha in sanghas
    ]

@app.get("/sanghas/managed")
def get_managed_sanghas(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Only admin and superadmin can access this.")

    query = db.query(Sanghas).filter(Sanghas.subadmin_id.is_(None))

    if current_user.role == "admin":
        query = query.filter(Sanghas.admin_id == current_user.id)
    # superadmin: sees all sanghas without a subadmin yet

    sanghas = query.all()

    return [{"id": s.id, "name": s.name} for s in sanghas]

@app.post("/admin-requests")
def create_admin_request(
    data: AdminRequestCreate,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin and superadmin can create an admin request."
        )

    sangha = (
        db.query(Sanghas)
        .filter(Sanghas.id == data.sangha_id)
        .first()
    )

    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha not found.")

    if sangha.admin_id is None:
        raise HTTPException(
            status_code=400,
            detail="This Sangha has no admin assigned yet."
        )

    if current_user.role == "admin" and sangha.admin_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only propose a subadmin for a Sangha you manage."
        )

    if sangha.subadmin_id is not None:
        raise HTTPException(
            status_code=400,
            detail="This Sangha already has a subadmin."
        )

    member = (
        db.query(User)
        .filter(User.id == data.requester_id)
        .first()
    )

    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    if member.role != "member":
        raise HTTPException(
            status_code=400,
            detail="Only members can be proposed as Admin."
        )

    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Reason is required.")

    existing_request = (
        db.query(SubAdminRequest)
        .filter(
            SubAdminRequest.sangha_id == data.sangha_id,
            SubAdminRequest.requester_id == data.requester_id,
            SubAdminRequest.status == RequestStatus.pending
        )
        .first()
    )

    if existing_request:
        raise HTTPException(status_code=400, detail="A pending request already exists.")

    new_request = SubAdminRequest(
    sangha_id=sangha.id,
    admin_id=current_user.id,
    requester_id=member.id,
    subadmin_name=member.fullname,
    subadmin_email=member.email,
    subadmin_phone=member.phone or "",
    address=member.address or "",
    aadhar_number=decrypt_value(member.id_proof_number_enc) if member.id_proof_number_enc else "",
    message=data.message.strip(),
    experience=None,
    qualifications=None,
    availability=None,
    additional_info=None,
    status=RequestStatus.pending,
    rejection_reason=None,
    reviewed_at=None
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {
        "message": "Admin request created successfully.",
        "request": {
            "id": new_request.id,
            "sangha_name": sangha.name,
            "candidate_name": member.fullname,
            "candidate_email": member.email,
            "candidate_phone": member.phone,
            "message": new_request.message,
            "status": new_request.status.value
        }
    }

@app.get("/admin-requests")
def get_admin_requests(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Only admin and superadmin can view admin requests.")

    query = db.query(SubAdminRequest).order_by(SubAdminRequest.submitted_at.desc())

    if current_user.role == "admin":
        query = query.filter(SubAdminRequest.admin_id == current_user.id)
    # superadmin: sees all requests

    requests = query.all()

    result = []
    for request in requests:
        sangha = db.query(Sanghas).filter(Sanghas.id == request.sangha_id).first()
        requesting_admin = db.query(User).filter(User.id == request.admin_id).first()

        result.append({
            "id": request.id,
            "sangha_id": request.sangha_id,
            "sangha_name": sangha.name if sangha else "-",
            "candidate_name": request.subadmin_name,
            "candidate_email": request.subadmin_email,
            "candidate_phone": request.subadmin_phone,
            "requested_by": requesting_admin.fullname if requesting_admin else "-",
            "message": request.message,
            "status": request.status.value if hasattr(request.status, "value") else request.status,
            "rejection_reason": request.rejection_reason
        })

    return result

@app.patch("/admin-requests/{request_id}/approve")
def approve_admin_request(
    request_id: int,
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Only superadmin can approve admin requests."
        )

    request_row = (
        db.query(SubAdminRequest)
        .filter(SubAdminRequest.id == request_id)
        .first()
    )

    if not request_row:
        raise HTTPException(status_code=404, detail="Request not found.")

    if request_row.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request has already been reviewed.")

    sangha = (
        db.query(Sanghas)
        .filter(Sanghas.id == request_row.sangha_id)
        .first()
    )
    if not sangha:
        raise HTTPException(status_code=404, detail="Sangha no longer exists.")

    member = (
        db.query(User)
        .filter(User.id == request_row.requester_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Candidate member no longer exists.")

    if member.role != "member":
        raise HTTPException(status_code=400, detail="Candidate is no longer eligible for promotion.")

    outgoing_admin_id = sangha.admin_id

    # Promote the proposed member to admin, replacing the current one on this sangha
    member.role = "admin"
    sangha.admin_id = member.id

    # If the outgoing admin no longer manages any sangha, demote them back to member
    if outgoing_admin_id is not None and outgoing_admin_id != member.id:
        outgoing_admin = db.query(User).filter(User.id == outgoing_admin_id).first()
        if outgoing_admin:
            db.flush()  # make sangha.admin_id change visible to the count below
            remaining = db.query(Sanghas).filter(Sanghas.admin_id == outgoing_admin_id).count()
            if remaining == 0:
                outgoing_admin.role = "member"

    request_row.status = RequestStatus.approved
    request_row.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(request_row)

    return {
        "id": request_row.id,
        "status": request_row.status.value,
        "detail": "Request approved. Member promoted to admin of this Sangha."
    }

@app.patch("/admin-requests/{request_id}/reject")
def reject_admin_request(
    request_id: int,
    payload: dict,  # {"reason": str} — optional
    db=Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Only superadmin can reject admin requests."
        )

    request_row = (
        db.query(SubAdminRequest)
        .filter(SubAdminRequest.id == request_id)
        .first()
    )

    if not request_row:
        raise HTTPException(status_code=404, detail="Request not found.")

    if request_row.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request has already been reviewed.")

    request_row.status = RequestStatus.rejected
    request_row.rejection_reason = (payload or {}).get("reason")
    request_row.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(request_row)

    return {
        "id": request_row.id,
        "status": request_row.status.value,
        "rejection_reason": request_row.rejection_reason,
        "detail": "Request rejected."
    }

@app.get("/admin-requests/pending-count")
def get_pending_admin_requests_count(
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user)
):
    current_user = (
        db.query(User)
        .filter(User.id == int(current_user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin and superadmin can view admin requests."
        )

    query = db.query(SubAdminRequest).filter(
        SubAdminRequest.status == RequestStatus.pending
    )

    if current_user.role == "admin":
        query = query.filter(SubAdminRequest.admin_id == current_user.id)
    # superadmin: no admin_id filter, sees global pending count

    count = query.count()

    return {"pending_count": count}

@app.patch("/sanghas/{sangha_id}")
def update_sangha(
    sangha_id: int,
    payload: SanghaUpdate,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    sangha = db.query(Sanghas).filter(Sanghas.id == sangha_id).first()
    if not sangha:
        raise HTTPException(404, "Sangha not found")

    # Only touch fields that were actually sent and non-empty —
    # this is the safety net; the frontend also only sends changed fields.
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and value.strip() != "":
            setattr(sangha, field, value.strip())

    db.commit()
    db.refresh(sangha)

    return {
        "id": sangha.id,
        "name": sangha.name,
        "code": sangha.code,
        "address": sangha.address,
        "city": sangha.city,
        "state": sangha.state,
    }

@app.delete("/sanghas/{sangha_id}")
def delete_sangha(
    sangha_id: int,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    current_user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found.")

    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not allowed.")

    sangha = db.query(Sanghas).filter(Sanghas.id == sangha_id).first()
    if not sangha:
        raise HTTPException(404, "Sangha not found")

    # An admin can only delete a sangha they manage
    if current_user.role == "admin" and sangha.admin_id != current_user.id:
        raise HTTPException(403, "You can only delete a Sangha you manage.")

    admin_id = sangha.admin_id
    subadmin_id = sangha.subadmin_id

    # 1. Detach all members (they become unassigned, not deleted)
    db.query(User).filter(User.sangha_id == sangha_id).update({User.sangha_id: None})

    # 2. Delete any requests tied to this sangha (they reference it by FK)
    db.query(SubAdminRequest).filter(SubAdminRequest.sangha_id == sangha_id).delete()

    # 3. Delete the sangha itself
    db.delete(sangha)
    db.flush()

    # 4. Demote the admin / subadmin if this was their only sangha
    demoted = []

    if admin_id:
        remaining = db.query(Sanghas).filter(Sanghas.admin_id == admin_id).count()
        if remaining == 0:
            admin_user = db.query(User).filter(User.id == admin_id).first()
            if admin_user and admin_user.role == "admin":
                admin_user.role = "member"
                demoted.append(admin_id)

    if subadmin_id:
        remaining = db.query(Sanghas).filter(Sanghas.subadmin_id == subadmin_id).count()
        if remaining == 0:
            sub_user = db.query(User).filter(User.id == subadmin_id).first()
            if sub_user and sub_user.role == "subadmin":
                sub_user.role = "member"
                demoted.append(subadmin_id)

    db.commit()

    return {"detail": "Sangha deleted", "demoted_user_ids": demoted}


@app.post("/me/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, or WEBP images are allowed.")

    user.profile_photo_image = await file.read()
    user.profile_photo_content_type = file.content_type
    db.commit()

    return {"detail": "Profile photo uploaded."}


@app.get("/me/profile-wizard")
def get_profile_wizard(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    bank = db.query(BankDetails).filter(BankDetails.user_id == user.id).first()

    return {
        "profile": {
            "fullname": user.fullname,
            "date_of_birth": user.date_of_birth,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
            "id_proof_type": user.id_proof_type,
            "id_proof_number_masked": mask_last4(decrypt_value(user.id_proof_number_enc)) if user.id_proof_number_enc else None,
            "has_profile_photo": bool(user.profile_photo_image),
            "has_pan_image": bool(user.pan_image_enc),
            "has_id_proof_image": bool(user.id_proof_image_enc),
        },
        "banking": {
            "pan_number_masked": mask_last4(decrypt_value(user.pan_number_enc)) if user.pan_number_enc else None,
            "account_number_masked": mask_last4(decrypt_value(bank.account_number_enc)) if bank and bank.account_number_enc else None,
            "account_holder_name": bank.account_holder_name if bank else None,
            "bank_name": bank.bank_name if bank else None,
            "account_type": bank.account_type if bank else None,
            "ifsc_code": bank.ifsc_code if bank else None,
            "branch_name": bank.branch_name if bank else None,
        },
    }


@app.patch("/me/complete-profile")   # was @app.post(...)
async def complete_profile(
    fullname: str | None = Form(None),
    date_of_birth: str | None = Form(None),
    phone: str | None = Form(None),
    address: str | None = Form(None),
    id_proof_number: str | None = Form(None),
    id_proof_type: str | None = Form(None),
    id_proof_image: UploadFile | None = File(None),
    pan_number: str | None = Form(None),
    pan_image: UploadFile | None = File(None),
    account_number: str | None = Form(None),
    account_holder_name: str | None = Form(None),
    bank_name: str | None = Form(None),
    account_type: str | None = Form(None),
    ifsc_code: str | None = Form(None),
    branch_name: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    # ...body unchanged from what I gave you before...
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if fullname:
        user.fullname = fullname.strip()
    if date_of_birth:
        user.date_of_birth = date_of_birth
    if phone:
        user.phone = phone.strip()
    if address:
        user.address = address.strip()

    if id_proof_type:
        if id_proof_type not in ("aadhaar", "passport"):
            raise HTTPException(422, detail="id_proof_type must be 'aadhaar' or 'passport'.")
        user.id_proof_type = id_proof_type

    if id_proof_number:
        cleaned = id_proof_number.strip().upper()
        h = hash_value(cleaned)
        clash = db.query(User).filter(User.id_proof_number_hash == h, User.id != user.id).first()
        if clash:
            raise HTTPException(422, detail="This ID proof number is already registered to another account.")
        user.id_proof_number_enc = encrypt_value(cleaned)
        user.id_proof_number_hash = h

    if id_proof_image is not None:
        if id_proof_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(422, detail="ID proof image must be JPEG, PNG, or WEBP.")
        raw = await id_proof_image.read()
        user.id_proof_image_enc = encrypt_bytes(raw)
        user.id_proof_image_content_type = id_proof_image.content_type

    if pan_number:
        pan = pan_number.strip().upper()
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan):
            raise HTTPException(422, detail="Invalid PAN format.")
        h = hash_value(pan)
        clash = db.query(User).filter(User.pan_number_hash == h, User.id != user.id).first()
        if clash:
            raise HTTPException(422, detail="This PAN is already registered to another account.")
        user.pan_number_enc = encrypt_value(pan)
        user.pan_number_hash = h

    if pan_image is not None:
        if pan_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(422, detail="PAN image must be JPEG, PNG, or WEBP.")
        raw = await pan_image.read()
        user.pan_image_enc = encrypt_bytes(raw)
        user.pan_image_content_type = pan_image.content_type

    if any([account_number, account_holder_name, bank_name, account_type, ifsc_code, branch_name]):
        bank = db.query(BankDetails).filter(BankDetails.user_id == user.id).first()
        if not bank:
            bank = BankDetails(user_id=user.id)
            db.add(bank)

        if account_number:
            digits = re.sub(r"\D", "", account_number.strip())
            if not (9 <= len(digits) <= 18):
                raise HTTPException(422, detail="Account number length looks invalid.")
            bank.account_number_enc = encrypt_value(digits)
        if account_holder_name:
            bank.account_holder_name = account_holder_name.strip()
        if bank_name:
            bank.bank_name = bank_name.strip()
        if account_type:
            bank.account_type = account_type
        if ifsc_code:
            ifsc = ifsc_code.strip().upper()
            if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc):
                raise HTTPException(422, detail="Invalid IFSC code.")
            bank.ifsc_code = ifsc
        if branch_name:
            bank.branch_name = branch_name.strip()

    db.commit()
    return {"detail": "Profile updated successfully."}



def _require_superadmin(db: Session, current_user_id):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can manage notifications.")
    return user


def _resolve_recipient_ids(db: Session, rule: str, sangha_ids: list[int] | None) -> list[int]:
    query = db.query(User.id).filter(User.role == "member")

    if sangha_ids:
        query = query.filter(User.sangha_id.in_(sangha_ids))
    else:
        query = query.filter(User.sangha_id.is_not(None))

    if rule == "Members Without Completed Profile":
        query = query.filter(
            or_(
                User.date_of_birth.is_(None),
                User.address.is_(None),
                User.id_proof_number_enc.is_(None),
            )
        )

    elif rule == "Members Without Banking Details":
        incomplete_banking_users = (
            db.query(BankDetails.user_id)
            .filter(
                or_(
                    BankDetails.account_holder_name.is_(None),
                    BankDetails.bank_name.is_(None),
                    BankDetails.account_type.is_(None),
                    BankDetails.ifsc_code.is_(None),
                    BankDetails.branch_name.is_(None),
                    BankDetails.account_number_enc.is_(None),
                )
            )
        )
        query = query.filter(
            or_(
                User.pan_number_enc.is_(None),
                ~User.id.in_(db.query(BankDetails.user_id)),
                User.id.in_(incomplete_banking_users),
            )
        )

    elif rule == "Members Without Completed Profile or Banking Details":
        incomplete_banking_users = (
            db.query(BankDetails.user_id)
            .filter(
                or_(
                    BankDetails.account_holder_name.is_(None),
                    BankDetails.bank_name.is_(None),
                    BankDetails.account_type.is_(None),
                    BankDetails.ifsc_code.is_(None),
                    BankDetails.branch_name.is_(None),
                    BankDetails.account_number_enc.is_(None),
                )
            )
        )
        query = query.filter(
            or_(
                User.date_of_birth.is_(None),
                User.address.is_(None),
                User.id_proof_number_enc.is_(None),
                User.pan_number_enc.is_(None),
                ~User.id.in_(db.query(BankDetails.user_id)),
                User.id.in_(incomplete_banking_users),
            )
        )

    return [row[0] for row in query.all()]


def _serialize(db: Session, n: Notification) -> dict:
    sangha_ids = json.loads(n.sangha_ids) if n.sangha_ids else []
    if sangha_ids:
        names = [s.name for s in db.query(Sanghas).filter(Sanghas.id.in_(sangha_ids)).all()]
        sangha_label = ", ".join(names) if names else "Selected Sanghas"
    else:
        sangha_label = "All Sanghas"

    return {
        "id": n.id,
        "title": n.title,
        "type": n.type,
        "recipient": n.recipient,
        "sanghaLabel": sangha_label,
        "sanghaIds": sangha_ids,
        "status": n.status,
        "sentAt": n.sent_at.strftime("%d %b %Y, %I:%M %p") if n.sent_at else "-",
        "message": n.message,
        "path": json.loads(n.navigation_path) if n.navigation_path else [],
    }

@app.get("/me/photo")
def get_my_photo(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user or not user.profile_photo_image:
        raise HTTPException(404, "No profile photo on file.")
    return Response(content=user.profile_photo_image, media_type=user.profile_photo_content_type or "image/jpeg")


@app.get("/superadmin/members/{member_id}/photo")
def get_member_photo(member_id: int, db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)
    user = db.query(User).filter(User.id == member_id).first()
    if not user or not user.profile_photo_image:
        raise HTTPException(404, "No profile photo on file.")
    return Response(content=user.profile_photo_image, media_type=user.profile_photo_content_type or "image/jpeg")

@app.get("/me/pan-image")
def get_my_pan_image(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user or not user.pan_image_enc:
        raise HTTPException(404, "No PAN image on file.")
    return Response(content=decrypt_bytes(user.pan_image_enc), media_type=user.pan_image_content_type or "image/jpeg")


@app.get("/me/id-proof-image")
def get_my_id_proof_image(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user or not user.id_proof_image_enc:
        raise HTTPException(404, "No ID proof image on file.")
    return Response(content=decrypt_bytes(user.id_proof_image_enc), media_type=user.id_proof_image_content_type or "image/jpeg")


@app.get("/superadmin/members/{member_id}/pan-image")
def get_member_pan_image(member_id: int, db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)
    user = db.query(User).filter(User.id == member_id).first()
    if not user or not user.pan_image_enc:
        raise HTTPException(404, "No PAN image on file.")
    return Response(content=decrypt_bytes(user.pan_image_enc), media_type=user.pan_image_content_type or "image/jpeg")


@app.get("/superadmin/members/{member_id}/id-proof-image")
def get_member_id_proof_image(member_id: int, db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)
    user = db.query(User).filter(User.id == member_id).first()
    if not user or not user.id_proof_image_enc:
        raise HTTPException(404, "No ID proof image on file.")
    return Response(content=decrypt_bytes(user.id_proof_image_enc), media_type=user.id_proof_image_content_type or "image/jpeg")

@app.get("/notifications")
def list_notifications(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)
    rows = db.query(Notification).order_by(Notification.created_at.desc()).all()
    return [_serialize(db, n) for n in rows]


@app.post("/notifications")
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    admin = _require_superadmin(db, current_user_id)

    if not payload.title.strip() or not payload.message.strip():
        raise HTTPException(status_code=422, detail="Title and message are required.")

    notification = Notification(
        title=payload.title.strip(),
        type=payload.type,
        recipient=payload.recipient,
        sangha_ids=json.dumps(payload.sangha_ids) if payload.sangha_ids else None,
        message=payload.message.strip(),
        navigation_path=json.dumps(payload.navigation_path) if (payload.include_path and payload.navigation_path) else None,
        status="Sent" if payload.send_now else "Draft",
        created_by=admin.id,
        sent_at=datetime.now(timezone.utc) if payload.send_now else None,
    )
    db.add(notification)
    db.flush()

    if payload.send_now:
        for uid in _resolve_recipient_ids(db, payload.recipient, payload.sangha_ids):
            db.add(NotificationRecipient(notification_id=notification.id, user_id=uid))

    db.commit()
    db.refresh(notification)
    return _serialize(db, notification)


# ---------- Member-facing (for when the Member Notifications page connects) ----------

@app.get("/me/notifications")
def get_my_notifications(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    rows = (
        db.query(NotificationRecipient, Notification)
        .join(Notification, NotificationRecipient.notification_id == Notification.id)
        .filter(NotificationRecipient.user_id == int(current_user_id))
        .order_by(Notification.sent_at.desc())
        .all()
    )
    return [
        {
            "id": recipient.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "path": json.loads(notif.navigation_path) if notif.navigation_path else [],
            "sentAt": notif.sent_at.strftime("%d %b %Y, %I:%M %p") if notif.sent_at else "-",
            "isRead": recipient.is_read,
        }
        for recipient, notif in rows
    ]


@app.patch("/me/notifications/{recipient_id}/read")
def mark_notification_read(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    recipient = (
        db.query(NotificationRecipient)
        .filter(NotificationRecipient.id == recipient_id, NotificationRecipient.user_id == int(current_user_id))
        .first()
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Notification not found.")
    recipient.is_read = True
    recipient.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"detail": "Marked as read"}

@app.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    _require_superadmin(db, current_user_id)

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found."
        )

    # Delete related recipients first
    db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id == notification_id
    ).delete(synchronize_session=False)

    db.delete(notification)
    db.commit()

    return {"detail": "Notification deleted successfully."}


@app.post("/notifications/clear-selected")
def clear_selected_notifications(
    payload: ClearNotificationsRequest,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    _require_superadmin(db, current_user_id)

    if not payload.notification_ids:
        raise HTTPException(
            status_code=400,
            detail="No notifications selected."
        )

    db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id.in_(
            payload.notification_ids
        )
    ).delete(synchronize_session=False)

    deleted_count = (
        db.query(Notification)
        .filter(Notification.id.in_(payload.notification_ids))
        .delete(synchronize_session=False)
    )

    db.commit()

    return {
        "detail": "Selected notifications cleared successfully.",
        "deleted_count": deleted_count,
    }

def _require_superadmin(db: Session, current_user_id):
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    if user.role != "superadmin" and user.role!="admin":
        raise HTTPException(status_code=403, detail="Only superadmin can access this.")
    return user


@app.get("/superadmin/members")
def list_members(db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)

    sangha = aliased(Sanghas)
    admin = aliased(User)

    rows = (
        db.query(User, sangha.name, admin.fullname)
        .join(BankDetails, BankDetails.user_id == User.id)
        .outerjoin(sangha, User.sangha_id == sangha.id)
        .outerjoin(admin, sangha.admin_id == admin.id)
        .filter(
            User.role == "member",
            User.date_of_birth.is_not(None),
            User.address.is_not(None),
            User.id_proof_number_enc.is_not(None),
            User.pan_number_enc.is_not(None),
            BankDetails.account_number_enc.is_not(None),
        )
        .all()
    )

    return [
        {
            "id": u.id,
            "name": u.fullname,
            "email": u.email,
            "phone": u.phone,
            "sanghaName": sangha_name or "-",
            "adminName": admin_name or "-",
            "isVerified": u.isVerified,
        }
        for u, sangha_name, admin_name in rows
    ]

@app.get("/superadmin/members/{member_id}")
def get_member_detail(member_id: int, db: Session = Depends(get_db), current_user_id=Depends(get_current_user)):
    _require_superadmin(db, current_user_id)

    member = db.query(User).filter(User.id == member_id, User.role == "member").first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    sangha_name = None
    if member.sangha_id:
        sangha = db.query(Sanghas).filter(Sanghas.id == member.sangha_id).first()
        sangha_name = sangha.name if sangha else None

    bank = db.query(BankDetails).filter(BankDetails.user_id == member.id).first()

    return {
        "id": member.id,
        "isVerified": member.isVerified,
        "profile": {
            "fullname": member.fullname,
            "email": member.email,
            "phone": member.phone,
            "address": member.address,
            "date_of_birth": member.date_of_birth,
            "id_proof_type": member.id_proof_type,
            "id_proof_number": decrypt_value(member.id_proof_number_enc) if member.id_proof_number_enc else None,
            "pan_number": decrypt_value(member.pan_number_enc) if member.pan_number_enc else None,
            "has_profile_photo": bool(member.profile_photo_image),
            "has_pan_image": bool(member.pan_image_enc),
            "has_id_proof_image": bool(member.id_proof_image_enc),
            "sanghaName": sangha_name or "-",
        },
        "banking": {
            "account_number": decrypt_value(bank.account_number_enc) if bank and bank.account_number_enc else None,
            "account_holder_name": bank.account_holder_name if bank else None,
            "bank_name": bank.bank_name if bank else None,
            "account_type": bank.account_type if bank else None,
            "ifsc_code": bank.ifsc_code if bank else None,
            "branch_name": bank.branch_name if bank else None,
        } if bank else None,
    }

@app.post("/superadmin/members/{member_id}/verify")
def verify_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user_id=Depends(get_current_user),
):
    _require_superadmin(db, current_user_id)

    member = db.query(User).filter(User.id == member_id, User.role == "member").first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    member.isVerified = True
    db.commit()

    return {"detail": "Member verified", "isVerified": True}

Base.metadata.create_all(bind=engine)

