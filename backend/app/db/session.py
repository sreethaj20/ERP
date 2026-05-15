from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=280,  # Slightly less than 300 to stay ahead of RDS connection reaping
    pool_size=15,      # Increased for better concurrency
    max_overflow=25,
    connect_args={"connect_timeout": 10},
    pool_timeout=30,   # Wait up to 30s for a connection from the pool
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
