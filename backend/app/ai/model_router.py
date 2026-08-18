from enum import Enum

class TaskType(str, Enum):
    EMBEDDING = "embedding"
    SENTIMENT = "sentiment"
    BIAS = "bias"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    ENTITY_EXTRACTION = "entity_extraction"
    KG_EXTRACTION = "kg_extraction"
    STRATEGIC_SCORING = "strategic_scoring"
    FORECASTING = "forecasting"
    RAG_QA = "rag_qa"
    EVENT_TITLE = "event_title"

def get_model(task: TaskType) -> tuple[str, str]:
    """Returns a tuple of (model_name, provider) where provider is 'groq' or 'ollama'."""
    routing = {
        TaskType.EMBEDDING:           ("nomic-embed-text",          "ollama"),
        TaskType.SENTIMENT:           ("qwen3.6-27b",      "groq"),
        TaskType.BIAS:                ("qwen3.6-27b",      "groq"),
        TaskType.TRANSLATION:         ("qwen3.6-27b",      "groq"),
        TaskType.SUMMARIZATION:       ("qwen3.6-27b",      "groq"),
        TaskType.STRATEGIC_SCORING:   ("qwen3.6-27b",      "groq"),

        # Routing configured to use Groq for entity extraction
        TaskType.ENTITY_EXTRACTION:   ("qwen3.6-27b",      "groq"),
        TaskType.KG_EXTRACTION:       ("qwen3.6-27b",      "groq"),

        # Advanced cloud LLM routing
        TaskType.FORECASTING:         ("qwen3.6-27b",   "groq"),
        TaskType.RAG_QA:              ("qwen3.6-27b",   "groq"),
        TaskType.EVENT_TITLE:         ("qwen3.6-27b",      "groq"),
    }
    return routing[task]
