from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
import torch
import numpy as np
import logging
from scipy.special import softmax

# Configure logging
logger = logging.getLogger(__name__)

model_path = "olafuraron/twitter-roberta-base-sentiment-latest-safetensors"
tokenizer = None
model = None
config = None

def load_sentiment_model():
    """
    Loads the sentiment analysis model and tokenizer.
    """
    global tokenizer, model, config
    try:
        logger.info(f"Loading sentiment model: {model_path}")
        # Explicitly use safetensors to avoid torch.load vulnerability issues
        tokenizer = AutoTokenizer.from_pretrained(model_path, use_safetensors=True)
        model = AutoModelForSequenceClassification.from_pretrained(model_path, use_safetensors=True)
        config = AutoConfig.from_pretrained(model_path)
        logger.info("Sentiment model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load sentiment model: {e}")

def analyze_sentiment(text: str) -> dict:
    """
    Analyzes the sentiment of the text.
    Returns a dictionary with 'label' and 'score'.
    """
    global tokenizer, model, config
    
    default_result = {"label": "Neutral", "score": 0.0}

    if not text:
        return default_result

    if model is None or tokenizer is None:
        logger.warning("Sentiment model not loaded. Returning default.")
        return default_result

    try:
        encoded_input = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        output = model(**encoded_input)
        scores = output[0][0].detach().numpy()
        scores = softmax(scores)

        # Labels for this specific model: 0 -> Negative, 1 -> Neutral, 2 -> Positive
        # Verify with config.id2label if available, but this is standard for this model.
        # However, let's allow dynamic label mapping if config has it.
        
        ranking = np.argsort(scores)
        ranking = ranking[::-1]
        
        top_label_id = ranking[0]
        top_score = scores[top_label_id]
        
        label_map = {0: "Negative", 1: "Neutral", 2: "Positive"}
        label = label_map.get(top_label_id, "Neutral")
        
        return {
            "label": label,
            "score": float(top_score)
        }

    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return default_result
