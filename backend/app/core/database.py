from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Create async database engine
# For postgresql, asyncpg requires the postgresql+asyncpg:// prefix.
# If database_url starts with postgresql://, replace it with postgresql+asyncpg://.
db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    pool_pre_ping=True,
    echo=False,
    pool_size=10,
    max_overflow=20,
    connect_args={
        "statement_cache_size": 0,  # Required for PgBouncer transaction mode compatibility
        "prepared_statement_cache_size": 0
    }
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# SQLAlchemy declarative base for model mappings
Base = declarative_base()

# FastAPI database session dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
