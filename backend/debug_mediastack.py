import os
import httpx
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

async def test_mediastack():
    api_key = os.getenv("MEDIASTACK_API")
    print(f"MEDIASTACK_API Key Present: {api_key is not None}")
    if not api_key:
        return

    # Try standard query
    url = "http://api.mediastack.com/v1/news"
    
    # 1. With keywords (our current implementation)
    params1 = {
        "access_key": api_key,
        "keywords": "diplomacy",
        "languages": "en",
        "limit": 10
    }
    
    # 2. Without keywords (raw global news)
    params2 = {
        "access_key": api_key,
        "languages": "en",
        "limit": 5
    }

    async with httpx.AsyncClient() as client:
        try:
            print("\n--- Test 1: With Keywords ---")
            resp = await client.get(url, params=params1)
            print(f"Status: {resp.status_code}")
            data = resp.json()
            print(f"Total results: {len(data.get('data', []))}")
            if 'error' in data:
                print(f"API Error: {data['error']}")
            else:
                for item in data.get('data', [])[:2]:
                    print(f"  - {item.get('title')} ({item.get('url')[:30]})")

            print("\n--- Test 2: Without Keywords ---")
            resp = await client.get(url, params=params2)
            print(f"Status: {resp.status_code}")
            data = resp.json()
            print(f"Total results: {len(data.get('data', []))}")
            if 'error' in data:
                print(f"API Error: {data['error']}")
            else:
                for item in data.get('data', [])[:2]:
                    print(f"  - {item.get('title')} ({item.get('url')[:30]})")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_mediastack())
