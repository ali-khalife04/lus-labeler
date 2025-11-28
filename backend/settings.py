from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
  database_url: str = f"sqlite:///{(BASE_DIR / 'lus_labeler.db').as_posix()}"
  drive_data_root_id: str = ""  # set via env DRIVE_DATA_ROOT_ID
  google_application_credentials: str = "drive-service-account.json"

  class Config:
    env_file = ".env"


settings = Settings()

