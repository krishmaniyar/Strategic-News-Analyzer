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
        TaskType.SENTIMENT:           ("llama-3.1-8b-instant",      "groq"),
        TaskType.BIAS:                ("llama-3.1-8b-instant",      "groq"),
        TaskType.TRANSLATION:         ("llama-3.1-8b-instant",      "groq"),
        TaskType.SUMMARIZATION:       ("llama-3.1-8b-instant",      "groq"),
        TaskType.STRATEGIC_SCORING:   ("llama-3.1-8b-instant",      "groq"),
        
        # Local model routing configured for the pulled qwen2.5:7b model
        TaskType.ENTITY_EXTRACTION:   ("qwen2.5:7b",                "ollama"),
        TaskType.KG_EXTRACTION:       ("qwen2.5:7b",                "ollama"),
        
        # Advanced cloud LLM routing
        TaskType.FORECASTING:         ("llama-3.3-70b-versatile",   "groq"),
        TaskType.RAG_QA:              ("llama-3.3-70b-versatile",   "groq"),
        TaskType.EVENT_TITLE:         ("llama-3.1-8b-instant",      "groq"),
    }
    return routing[task]
