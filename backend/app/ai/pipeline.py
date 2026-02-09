from sqlalchemy.orm import Session
from ..models import NewsArticle
from .translation import translate_text
from .sentiment import analyze_sentiment
from .bias import detect_bias
from .strategic_score import compute_strategic_score
from langdetect import detect, LangDetectException
import logging

logger = logging.getLogger(__name__)

def run_ai_pipeline(db: Session, batch_size: int = 10):
    """
    Runs the AI pipeline for unprocessed articles.
    """
    try:
        # Run until no more unprocessed articles (or up to a safety limit)
        total_processed = 0
        while True:
            # Fetch unprocessed articles
            articles = db.query(NewsArticle).filter(NewsArticle.ai_processed == False).limit(batch_size).all()
            
            if not articles:
                break
                
            count = 0
            total = len(articles)
            
            for article in articles:
                count += 1
                logger.info(f"Processing article {count}/{total}: {article.title[:30]}...")
                
                try:
                    # 0. Language Detection
                    detected_lang = "en"
                    try:
                        # Combine title and content for better detection
                        sample_text = (article.title or "") + " " + (article.content or "")
                        if len(sample_text.strip()) > 20: # Start detection only if enough text
                            detected_lang = detect(sample_text)
                            article.language = detected_lang
                    except LangDetectException:
                        logger.warning(f"Could not detect language for article {article.id}, defaulting to 'en'")
                    except Exception as e:
                        logger.warning(f"Language detection error: {e}")

                    # 1. Translation
                    # Always translate if detected language is NOT English, or if we want to be safe
                    # Translate content for display
                    text_to_analyze = article.content if article.content else article.title
                    if text_to_analyze:
                         article.translated_text = translate_text(text_to_analyze)

                    # Translate TITLE for analysis (as requested)
                    if article.title:
                        article.translated_title = translate_text(article.title)
                    
                    # Use translated TITLE for analysis
                    # If translation failed (empty) or wasn't needed, fallback to original title
                    analysis_source_text = article.translated_title if article.translated_title else article.title
                    
                    # 2. Sentiment
                    sentiment_result = analyze_sentiment(analysis_source_text)
                    article.sentiment_label = sentiment_result['label']
                    article.sentiment_score = sentiment_result['score']
                    
                    # 3. Bias
                    bias_result = detect_bias(analysis_source_text)
                    article.bias_label = bias_result['label']
                    article.bias_score = bias_result['score']
                    
                    # 4. Strategic Score
                    # Convert article to dict for scoring func
                    article_dict = {
                        "title": article.title,
                        "content": article.content,
                        "translated_title": article.translated_title,
                        "translated_text": article.translated_text,
                        "source": article.source,
                        "published_at": article.published_at
                    }
                    strategic_data = compute_strategic_score(article_dict, sentiment_result, bias_result)
                    
                    article.strategic_score = strategic_data.get('strategic_score', 0)
                    article.risk_level = strategic_data.get('risk_level', 'Low')
                    article.key_factors = strategic_data.get('key_factors', '[]')
                    article.summary_reason = strategic_data.get('summary_reason', '')
                    
                    # Mark as processed
                    article.ai_processed = True
                    
                except Exception as e:
                    logger.error(f"Error processing article {article.id}: {e}")
                    # Optional: mark as processed to skip next time, or leave to retry?
                    # For now, let's leave it unprocessed or add a retry count (not in schema yet).
                    # To prevent infinite loops on bad data, let's mark it processed but log error.
                    article.ai_processed = True 
    
            total_processed += count
            db.commit()
            logger.info(f"Batch complete. Processed {count} articles. Total so far: {total_processed}")
    
        return {"status": "Success", "processed_count": total_processed}

    except Exception as e:
        logger.error(f"Pipeline run failed: {e}")
        db.rollback()
        return {"status": "Error", "detail": str(e)}
