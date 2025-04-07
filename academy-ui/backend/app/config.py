import os
from dotenv import load_dotenv
from pydantic import BaseSettings

# .env dosyasını yükle
load_dotenv()

class Settings(BaseSettings):
    # MongoDB Ayarları
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "academy_ui")
    
    # JWT Ayarları
    secret_key: str = os.getenv("SECRET_KEY", "your_default_secret_key")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

settings = Settings()
