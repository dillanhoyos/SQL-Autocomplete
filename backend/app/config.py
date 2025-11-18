import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    mistral_api_key: str
    environment: str = "development"
    log_level: str = "info"
    llm_timeout_ms: int = 100
    max_conversation_history: int = 5
    max_workers: int = 4
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

