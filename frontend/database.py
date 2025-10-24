"""
Database configuration and connection management for PostgreSQL
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

class Database:
    def __init__(self):
        self.database_url = 'postgresql://alkarimali:mypassword123@localhost:5432/coam_saas_db'
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.Base = declarative_base()

    def connect(self):
        try:
            with self.engine.connect() as connection:
                print("Connected to PostgreSQL")
        except Exception as e:
            print(f"Failed to connect: {str(e)}")

    def create_tables(self):
        try:
            self.Base.metadata.create_all(bind=self.engine)
            print("Database tables created successfully")
        except Exception as e:
            print(f"Failed to create tables: {str(e)}")

    def get_db(self):
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

# Global instances
database = Database()
SessionLocal = database.SessionLocal
Base = database.Base
