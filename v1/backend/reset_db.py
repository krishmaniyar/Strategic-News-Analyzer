import logging
from sqlalchemy import create_engine, text
from app.models import Base
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)

def reset_database():
    print("Are you sure you want to delete all data? (y/n)")
    confirm = input()
    if confirm.lower() != 'y':
        print("Aborted.")
        return

    print("Resetting database...")
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    print("Database reset complete.")

if __name__ == "__main__":
    reset_database()
