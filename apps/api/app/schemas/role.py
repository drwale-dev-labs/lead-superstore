from pydantic import BaseModel


class Role(BaseModel):
    id: str
    name: str
    unit: str
    description: str | None = None
    responsibilities: list[list[str]] | None = None
    requirements: list[str] | None = None
    is_active: bool = True