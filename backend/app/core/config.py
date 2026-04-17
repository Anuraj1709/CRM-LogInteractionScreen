from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "local"
    api_v1_prefix: str = "/api"
    groq_api_key: str = ""
    groq_model: str = "gemma2-9b-it"
    groq_reasoning_model: str = "llama-3.3-70b-versatile"
    database_url: str = "postgresql+psycopg://crm_user:crm_pass@localhost:5432/ai_first_crm"
    interaction_store_path: str = "data/interactions.json"


settings = Settings()
