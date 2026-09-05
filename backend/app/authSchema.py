from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re


def validate_password_strength(val: str) -> str:
    if len(val) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[a-z]", val):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", val):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=/\\[\]]", val):
        raise ValueError("Password must contain at least one special character")
    return val


class NewUser(BaseModel):
    username: str
    fullname: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str
    aadhar_number: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, val: str) -> str:
        return validate_password_strength(val)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, val: str, info) -> str:
        if "password" in info.data and val != info.data["password"]:
            raise ValueError("Passwords do not match")
        return val


class LoginUser(BaseModel):
    email: str
    password: str

class NewSanghas(BaseModel):
    name: str
    address: str
    city: str
    state: str
    admin_id: int | None = None

class Search(BaseModel):
    name: str
    email:str
    phone:str
    status:bool

class AdminRequestCreate(BaseModel):
    sangha_id: int
    requester_id: int
    message: str


class AdminRequestResponse(BaseModel):
    id: int
    sangha_name: str
    candidate_name: str
    candidate_email: str
    candidate_phone: str | None
    message: str | None
    status: str
    rejection_reason: str | None


