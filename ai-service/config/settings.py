from functools import lru_cache
from pydantic import BaseModel, Field
import os


class Settings(BaseModel):
    """
    Centralized configuration for the AssetBridge AI internal microservice.
    Loaded from environment variables with sensible development defaults.
    """
    service_name: str = "AssetBridge-AI-Service"
    environment: str = os.getenv("ASSETBRIDGE_AI_ENV", "development")
    host: str = os.getenv("ASSETBRIDGE_AI_HOST", "127.0.0.1")
    port: int = int(os.getenv("ASSETBRIDGE_AI_PORT", "5001"))
    
    # Internal ASP.NET Core backend endpoint
    backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:5206/api")
    
    # Execution & Safety Boundaries
    default_agent_timeout_seconds: float = float(os.getenv("DEFAULT_AGENT_TIMEOUT_SECONDS", "30.0"))
    max_agent_retries: int = int(os.getenv("MAX_AGENT_RETRIES", "3"))
    initial_retry_backoff_seconds: float = float(os.getenv("INITIAL_RETRY_BACKOFF_SECONDS", "0.5"))
    
    # LLM Provider Configuration (Placeholders for future phases - no hardcoded secrets)
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    llm_model_name: str = os.getenv("LLM_MODEL_NAME", "mock-agent-v1")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
