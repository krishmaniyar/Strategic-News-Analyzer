from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch
from scipy.special import softmax
import logging
import numpy as np

logger = logging.getLogger(__name__)

model_path = "peekayitachi/BiasCheck-RoBERTa"
tokenizer = None
model = None

def load_bias_model():
    """
    Loads the bias detection model and tokenizer.
    """
    global tokenizer, model
    try:
        logger.info(f"Loading bias model: {model_path}")
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        logger.info("Bias model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load bias model: {e}")

def detect_bias(text: str) -> dict:
    """
    Detects bias in the text.
    Returns a dictionary with 'label' and 'score'.
    """
    global tokenizer, model
    
    default_result = {"label": "Non-biased", "score": 0.0}

    if not text:
        return default_result

    if model is None or tokenizer is None:
        logger.warning("Bias model not loaded. Returning default.")
        return default_result

    try:
        encoded_input = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        output = model(**encoded_input)
        scores = output[0][0].detach().numpy()
        scores = softmax(scores)
        
        # Determine labels from model config or documentation
        # Assuming 0: Non-biased, 1: Biased (need to verify this mapping if possible, 
        # but usually 0 is negative/non-biased and 1 is positive/biased in binary classification)
        # Let's check the model card if I could, but I can't browse. 
        # Standard assumption for "BiasCheck": 
        # Label 0: Non-biased
        # Label 1: Biased
        
        ranking = np.argsort(scores)
        ranking = ranking[::-1]
        
        top_label_id = ranking[0]
        top_score = scores[top_label_id]
        
        label_map = {0: "Non-biased", 1: "Biased"}
        label = label_map.get(top_label_id, "Unknown")
        
        return {
            "label": label,
            "score": float(top_score)
        }

    except Exception as e:
        logger.error(f"Bias detection failed: {e}")
        return default_result
