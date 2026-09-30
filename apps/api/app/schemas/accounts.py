from pydantic import BaseModel, EmailStr, Field


class CreateAccountRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str | None = Field(None, max_length=200)


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=72)


class UpdateAccountRequest(BaseModel):
    full_name: str | None = Field(None, max_length=200)
