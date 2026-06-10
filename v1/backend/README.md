# Geopolitical News Aggregator Backend

This is the backend for the AI-based geopolitical news aggregation platform.

## Setup

1.  **Clone the repository** (if you haven't already).
2.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```
3.  **Create a virtual environment** (recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
5.  **Configure Environment Variables**:
    - Copy `.env.example` to `.env`.
    - Add your API keys if you have them.
    - Set `DEMO_MODE=true` to use the provided sample data without API keys.

## Running the Server

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.
Interactive API docs: `http://127.0.0.1:8000/docs`.

## API Endpoints

-   `GET /news`: List latest articles.
-   `GET /news/{id}`: Get article details.
-   `POST /admin/fetch-news`: Trigger news ingestion (fetches from APIs or demo file).
-   `GET /admin/health`: Backend health check.

## Demo Mode

To run without external API keys, ensure `DEMO_MODE=true` is set in your `.env` file. This will substitute live API calls with data from a local JSON file.
