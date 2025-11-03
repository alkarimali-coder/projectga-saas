from sqlalchemy import create_engine, text
from backend.db.session import DATABASE_URL

engine = create_engine(DATABASE_URL.replace("asyncpg", "psycopg2"))

with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS service_jobs (
            id SERIAL PRIMARY KEY,
            machine_id INTEGER,
            tenant_id INTEGER,
            status VARCHAR DEFAULT 'pending',
            notes TEXT
        )
    """))
    conn.commit()
    print("Table 'service_jobs' created")
