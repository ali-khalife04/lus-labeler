from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from settings import settings

DATABASE_URL = settings.database_url

# Detect if we are using SQLite so we can set the proper connect_args
is_sqlite = DATABASE_URL.startswith("sqlite:///")

if is_sqlite:
    # check_same_thread is needed only for SQLite
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # For Postgres/MySQL/etc. we do not pass SQLite-specific connect_args
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

