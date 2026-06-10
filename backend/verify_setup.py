import os
import sys
import asyncio
from dotenv import load_dotenv

# Load backend/.env
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

async def test_supabase():
    print("Testing Supabase Database connection...")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL not found in .env file.")
        return False
    try:
        import asyncpg
        conn = await asyncpg.connect(db_url)
        version = await conn.fetchval("SELECT version()")
        print(f"[OK] Supabase Connected! Version: {version}")
        await conn.close()
        return True
    except Exception as e:
        # Avoid print exception containing emojis
        err_msg = str(e)
        print(f"[ERROR] Error connecting to Supabase Database: {err_msg}")
        return False

def test_groq():
    print("\nTesting Groq API connection...")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[ERROR] GROQ_API_KEY not found in .env file.")
        return False
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say: GROQ_OK"}]
        )
        answer = resp.choices[0].message.content.strip()
        print(f"[OK] Groq Connection OK! Response: {answer}")
        return True
    except Exception as e:
        print(f"[ERROR] Error connecting to Groq API: {e}")
        return False

async def test_ollama():
    print("\nTesting local Ollama server...")
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{ollama_url}/api/tags", timeout=5.0)
            if resp.status_code == 200:
                models_data = resp.json()
                models = [m["name"] for m in models_data.get("models", [])]
                print(f"[OK] Ollama Server is running. Found models: {models}")
                
                required_models = ["nomic-embed-text:latest"]
                optional_models = ["qwen2.5:3b", "qwen2.5:7b", "llama3.2:3b"]
                
                all_ok = True
                for req in required_models:
                    base_req = req.split(":")[0]
                    found = False
                    for m in models:
                        if m.startswith(base_req):
                            found = True
                            break
                    if found:
                        print(f"  - Required Model '{req}' is present.")
                    else:
                        print(f"  - [ERROR] Required Model '{req}' is MISSING. Please run: ollama pull {req}")
                        all_ok = False
                
                for opt in optional_models:
                    base_opt = opt.split(":")[0]
                    found = False
                    for m in models:
                        if m.startswith(base_opt):
                            found = True
                            break
                    if found:
                        print(f"  - Optional Model '{opt}' is present (will use local Ollama inference).")
                    else:
                        print(f"  - Optional Model '{opt}' is absent (will fallback to Groq inference).")
                
                return all_ok
            else:
                print(f"[ERROR] Ollama server returned status code: {resp.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Error connecting to Ollama server: {e}")
        return False

async def main():
    print("=================== Setup Verification ===================")
    db_ok = await test_supabase()
    groq_ok = test_groq()
    ollama_ok = await test_ollama()
    print("==========================================================")
    if db_ok and groq_ok and ollama_ok:
        print("[SUCCESS] All systems verified successfully! Environment is ready.")
        sys.exit(0)
    else:
        print("[WARNING] Setup incomplete or has errors. Please check the failures above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
