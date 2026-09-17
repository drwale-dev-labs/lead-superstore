from pydantic import BaseModel, EmailStr, Field


class CreateAccountRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=72)
