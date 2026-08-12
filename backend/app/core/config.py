from typing import Optional
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv, find_dotenv

# Automatically locate .env in current or parent directories
env_file_path = find_dotenv(usecwd=True)
if env_file_path:
    load_dotenv(env_file_path)
else:
    load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "HRMS Backend"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-prod")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)) # 15 mins for OWASP compliance
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
    JWT_ISSUER: str = os.getenv("JWT_ISSUER", "mercure-hrms")
    JWT_AUDIENCE: str = os.getenv("JWT_AUDIENCE", "mercure-app")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")
    
    # File Uploads
    UPLOAD_DIR: str = "uploads"
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: Optional[str] = os.getenv("AWS_REGION", "ap-south-1")
    AWS_S3_BUCKET: Optional[str] = os.getenv("AWS_S3_BUCKET")
    AWS_S3_PUBLIC_BASE_URL: Optional[str] = os.getenv("AWS_S3_PUBLIC_BASE_URL")
    
    class Config:
        case_sensitive = True

settings = Settings()
