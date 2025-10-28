from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# REPLACE WITH YOUR NEON DB URL
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_Vtij0Bw7ASkL@ep-frosty-glitter-a4esytin-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
