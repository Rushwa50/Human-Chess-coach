from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    app_name: str = "Chess Human Coach AI"
    database_url: str = "sqlite+aiosqlite:///./chess_coach.db"
    jwt_secret_key: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    stockfish_path: str = r"c:\Users\Rushwa\OneDrive\Desktop\Chess Coach AI\backend\stockfish18\stockfish\stockfish-windows-x86-64-avx2.exe"
    stockfish_depth: int = 16
    stockfish_time_limit: float = 0.0
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
