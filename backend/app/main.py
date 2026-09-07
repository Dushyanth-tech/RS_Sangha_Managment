from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.authSchema import NewUser, LoginUser, NewSanghas, Search, AdminRequestCreate,AddAdminRequest
from app.authModal import User, Sanghas, SubAdminRequest, RequestStatus
from app.dbconnection import get_db, engine, Base
from app.auth import create_access_token, hash_password, verify_password, get_current_user
from sqlalchemy import or_,func
from sqlalchemy.orm import aliased, Session
from datetime import datetime, timezone

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
        aadhar_number=user.aadhar_number
    )

    # Add the new user to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}

@app.post("/auth/login")
def login_user(user: LoginUser, db=Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

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
    new_sangha = Sanghas(
        name=sangha.name,
        address=sangha.address,
        city=sangha.city,
        state=sangha.state,
        isActive=True,
        membersCount=0,
        created_by=int(current_user_id),
        admin_id=sangha.admin_id,
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
    admin = aliased(User)
    subadmin = aliased(User)

    rows = (
        db.query(
            Sanghas,
            admin.fullname.label("admin_name"),
            subadmin.fullname.label("subadmin_name"),
        )
        .outerjoin(admin, Sanghas.admin_id == admin.id)
        .outerjoin(subadmin, Sanghas.subadmin_id == subadmin.id)
        .all()
    )

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
    if member.sangha_id == sangha_id:
        raise HTTPException(400, "User is already a member of this sangha")

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
    query = db.query(User).filter(User.role == role)

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

    return [
        {
            "id": u.id,
            "name": u.fullname,
            "email": u.email,
            "phone": u.phone,
            "isActive": u.isActive,
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
    # Find selected member
    member = db.query(User).filter(
        User.id == payload.member_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # User must currently be a member
    if member.role != "member":
        raise HTTPException(
            status_code=400,
            detail="User is not eligible for promotion"
        )

    # Find selected Sangha
    sangha = db.query(Sanghas).filter(
        Sanghas.id == payload.sangha_id
    ).first()

    if not sangha:
        raise HTTPException(
            status_code=404,
            detail="Sangha not found"
        )

    # Make sure Sangha doesn't already have an admin
    if sangha.admin_id is not None:
        raise HTTPException(
            status_code=400,
            detail="This Sangha already has an admin"
        )

    # --------------------------------
    # UPDATE USERS TABLE
    # --------------------------------

    member.role = "admin"

    # If your User model has sangha_id,
    # keep this if an admin should also belong
    # to this Sangha.
    member.sangha_id = sangha.id

    # --------------------------------
    # UPDATE SANGHAS TABLE
    # --------------------------------

    sangha.admin_id = member.id

    # Save both changes
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
            "aadhar_number": member.aadhar_number
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

@app.post("/admin-requests")
def create_admin_request(
    data: AdminRequestCreate,
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
            detail="Only admin and superadmin can create an admin request."
        )

    # Find Sangha
    sangha = (
        db.query(Sanghas)
        .filter(Sanghas.id == data.sangha_id)
        .first()
    )

    if not sangha:
        raise HTTPException(
            status_code=404,
            detail="Sangha not found."
        )

    if sangha.admin_id is not None:
        raise HTTPException(
            status_code=400,
            detail="This Sangha already has an admin."
        )

    # Find selected member
    member = (
        db.query(User)
        .filter(User.id == data.requester_id)
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=404,
            detail="Member not found."
        )

    if member.role != "member":
        raise HTTPException(
            status_code=400,
            detail="Only members can be proposed as Admin."
        )

    # Message is required
    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Reason is required."
        )

    # Check duplicate pending request
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
        raise HTTPException(
            status_code=400,
            detail="A pending request already exists."
        )

    # Create request
    new_request = SubAdminRequest(
        sangha_id=sangha.id,
        admin_id=current_user.id,
        requester_id=member.id,

        subadmin_name=member.fullname,
        subadmin_email=member.email,
        subadmin_phone=member.phone or "",

        address=member.address or "",
        aadhar_number=member.aadhar_number or "",

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
            detail="Only admin and superadmin can view admin requests."
        )

    requests = (
        db.query(SubAdminRequest)
        .order_by(
            SubAdminRequest.submitted_at.desc()
        )
        .all()
    )

    result = []

    for request in requests:

        sangha = (
            db.query(Sanghas)
            .filter(
                Sanghas.id == request.sangha_id
            )
            .first()
        )

        requesting_admin = (
            db.query(User)
            .filter(User.id == request.admin_id)
            .first()
        )

        result.append({
            "id": request.id,
            "sangha_id": request.sangha_id,
            "sangha_name": sangha.name if sangha else "-",
            "candidate_name": request.subadmin_name,
            "candidate_email": request.subadmin_email,
            "candidate_phone": request.subadmin_phone,
            "requested_by": requesting_admin.fullname if requesting_admin else "-",
            "message": request.message,
            "status": (
                request.status.value
                if hasattr(request.status, "value")
                else request.status
            ),
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
    if sangha.admin_id is not None:
        raise HTTPException(status_code=400, detail="This Sangha already has an admin.")

    member = (
        db.query(User)
        .filter(User.id == request_row.requester_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Candidate member no longer exists.")

    # Promote the member and assign them as the sangha's admin
    member.role = "admin"
    sangha.admin_id = member.id

    request_row.status = RequestStatus.approved
    request_row.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(request_row)

    return {
        "id": request_row.id,
        "status": request_row.status.value,
        "detail": "Request approved. Member promoted to admin."
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


Base.metadata.create_all(bind=engine)