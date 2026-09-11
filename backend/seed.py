from app.dbconnection import SessionLocal
from app.authModal import User
from app.main import hash_password


db = SessionLocal()

try:
    # Check whether SuperAdmin already exists
    existing_superadmin = (
        db.query(User)
        .filter(User.role == "superadmin")
        .first()
    )

    if existing_superadmin:
        print("SuperAdmin already exists.")
    else:
        superadmin = User(
            fullname="Dushyanth S N",
            username="_dushyanth_",
            email="dushyanth@gmail.com",
            phone="7892513864",
            password=hash_password("dushyanth@123"),
            role="superadmin",
        )

        db.add(superadmin)
        db.commit()

        print("SuperAdmin created successfully.")

finally:
    db.close()