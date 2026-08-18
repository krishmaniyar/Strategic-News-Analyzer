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
        TaskType.SENTIMENT:           ("openai/gpt-oss-120b",      "groq"),
        TaskType.BIAS:                ("openai/gpt-oss-120b",      "groq"),
        TaskType.TRANSLATION:         ("openai/gpt-oss-120b",      "groq"),
        TaskType.SUMMARIZATION:       ("openai/gpt-oss-120b",      "groq"),
        TaskType.STRATEGIC_SCORING:   ("openai/gpt-oss-120b",      "groq"),

        # Routing configured to use Groq for entity extraction
        TaskType.ENTITY_EXTRACTION:   ("openai/gpt-oss-120b",      "groq"),
        TaskType.KG_EXTRACTION:       ("openai/gpt-oss-120b",      "groq"),

        # Advanced cloud LLM routing
        TaskType.FORECASTING:         ("openai/gpt-oss-120b",   "groq"),
        TaskType.RAG_QA:              ("openai/gpt-oss-120b",   "groq"),
        TaskType.EVENT_TITLE:         ("openai/gpt-oss-120b",      "groq"),
    }
    return routing[task]
