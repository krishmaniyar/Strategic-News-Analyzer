# 🌍 Geopolitical Intelligence Dashboard

A sophisticated news aggregator and analysis platform designed to track, score, and visualize global news trends with a focus on strategic intelligence.

## 🚀 Key Features

*   **Multi-Source Aggregation**: Fetches real-time news from **NewsAPI**, **GNews**, and **MediaStack**, covering global regions including the US and India.
*   **AI-Powered Analysis**:
    *   **Strategic Scoring**: A custom weighted algorithm evaluates articles based on keywords, sentiment, region, source credibility, and recency.
    *   **Sentiment Analysis**: Uses **RoBERTa** (cardiffnlp/twitter-roberta-base-sentiment-latest) for high-accuracy sentiment detection.
    *   **Bias Detection**: Identifies potential propaganda or biased language using specialized NLP models.
*   **Foreign Intelligence**: Automatically detects non-English articles (e.g., Hindi, Russian, French) and translates them for seamless analysis.
*   **Interactive Dashboard**:
    *   "Strategic Slate" dark-themed UI for a professional intelligence look.
    *   Real-time charts for Sentiment and Bias distribution.
    *   Advanced filtering by Score, Sentiment, and Keywords.
    *   Color-coded indicators for rapid assessment.

## 🛠️ Tech Stack

### Backend
*   **Framework**: FastAPI (Python)
*   **Database**: SQLite (SQLAlchemy)
*   **AI/ML**: 
    *   `transformers` (HuggingFace)
    *   `torch` (PyTorch)
    *   `deep-translator`
    *   `langdetect`
*   **Task Management**: Asyncio based background processing

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: Custom CSS (Strategic Slate Theme)
*   **Visualization**: Recharts
*   **Icons**: Lucide React

## 📦 Installation & Setup

### Prerequisites
*   Python 3.9+
*   Node.js 16+
*   API Keys for (NewsAPI, GNews, MediaStack) - *Optional strictly, but needed for fetching new data*

### 1. Backend Setup

```bash
cd backend
# Create virtual environment
python -m venv venv
# Activate (Windows)
.\venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Server
uvicorn app.main:app --reload
```
*The backend will start at `http://localhost:8000`*

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install

# Run Development Server
npm run dev
```
*The dashboard will start at `http://localhost:5173`*

## 🧠 Strategic Score Formula

The core of the analysis is the **Strategic Score (0-100)**, calculated as:

```
Score = (Keyword * 0.30) + (Sentiment * 0.20) + (Bias * 0.15) + (Region * 0.20) + (Source * 0.10) + (Recency * 0.05)
```

This ensures that critical topics from high-priority regions are highlighted even if the sentiment is neutral.

## 📝 License
MIT
