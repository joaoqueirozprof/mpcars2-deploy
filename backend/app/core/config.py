from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MPCARS"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "mpcars2-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DATABASE_URL: str = "postgresql://mpcars2:mpcars2pass@mpcars2-db:5432/mpcars2"
    REDIS_URL: str = "redis://mpcars2-redis:6379/0"

    CORS_ORIGINS: list = [
        "http://72.61.129.78:3002",
        "http://localhost:3002",
        "http://localhost:5173"
    ]

    class Config:
        env_file = ".env"


settings = Settings()
