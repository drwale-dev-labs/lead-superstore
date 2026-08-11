from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    ANTHROPIC_API_KEY: str | None = None
    PAYSTACK_SECRET_KEY: str | None = None
    RESEND_API_KEY: str | None = None
    EMAIL_FROM_ADDRESS: str = "Lead Superstore <onboarding@resend.dev>"
    ECOMMERCE_URL: str = "http://localhost:3001"
    ENVIRONMENT: str = "development"


settings = Settings()