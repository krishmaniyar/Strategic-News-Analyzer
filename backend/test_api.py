import urllib.request
import json
import sys

def test_api():
    print("==========================================================")
    print("[RUN] Running API Endpoint Verification Test")
    print("==========================================================")

    base_url = "http://127.0.0.1:8000"

    # Test Health Endpoint
    try:
        print("Testing Health Endpoint: GET /health ...")
        with urllib.request.urlopen(f"{base_url}/health", timeout=5.0) as response:
            status_code = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            if status_code == 200 and body.get("status") == "healthy":
                print(f"[OK] GET /health OK! Status: {body}")
            else:
                print(f"[ERROR] GET /health returned invalid response: {status_code} - {body}")
                sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error reaching GET /health: {e}")
        sys.exit(1)

    # Test Articles Listing Endpoint
    try:
        print("\nTesting Articles Listing Endpoint: GET /api/v2/articles/ ...")
        with urllib.request.urlopen(f"{base_url}/api/v2/articles/?limit=5", timeout=5.0) as response:
            status_code = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            if status_code == 200:
                print(f"[OK] GET /api/v2/articles/ OK!")
                print(f"  - Total Ingested Articles in response: {body.get('count', 0)}")
                print(f"  - Sample Articles:")
                for i, art in enumerate(body.get("articles", []), 1):
                    print(f"    {i}. [{art.get('language')}] {art.get('title')[:60]}... ({art.get('url')[:40]}...)")
                    analysis = art.get("analysis")
                    if analysis:
                        print(f"       Sentiment: {analysis.get('sentiment_label')} ({analysis.get('sentiment_score')}), Bias: {analysis.get('bias_label')} ({analysis.get('bias_score')}), Strategic Score: {analysis.get('strategic_score')}, Risk Level: {analysis.get('risk_level')}")
                    else:
                        print(f"       [No Analysis Data]")
            else:
                print(f"[ERROR] GET /api/v2/articles/ returned invalid response: {status_code}")
                sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error reaching GET /api/v2/articles/: {e}")
        sys.exit(1)

    print("==========================================================")
    print("[SUCCESS] API Verification Test Passed Successfully!")
    print("==========================================================")

if __name__ == "__main__":
    test_api()
