from pydantic import BaseModel, EmailStr, Field


class RequestLoginCode(BaseModel):
    email: EmailStr


class VerifyLoginCode(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
