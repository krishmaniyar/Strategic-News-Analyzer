import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL not found in .env file.")
        return
        
    print("Connecting to Supabase database...")
    try:
        import asyncpg
    except ImportError:
        print("[ERROR] asyncpg not installed in current environment. Please install it.")
        return

    # Read SQL migrations file
    migrations_file = os.path.join(os.path.dirname(__file__), "migrations.sql")
    if not os.path.exists(migrations_file):
        print(f"[ERROR] Migrations file not found at {migrations_file}")
        return

    with open(migrations_file, "r") as f:
        sql = f.read()

    try:
        conn = await asyncpg.connect(db_url)
        print("Connected! Running database migrations...")
        
        # Execute the SQL script directly
        # Since it contains multiple statements, conn.execute is appropriate
        await conn.execute(sql)
        
        print("[SUCCESS] Migrations applied successfully!")
        await conn.close()
    except Exception as e:
        print(f"[ERROR] Error executing migrations: {e}")

if __name__ == "__main__":
    asyncio.run(main())
