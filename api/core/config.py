"""API configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "translate"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    use_mock_db: bool = False  # Set USE_MOCK_DB=true to force in-memory mock
    use_mock_db: bool = False  # Set USE_MOCK_DB=true to force in-memory mock

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
