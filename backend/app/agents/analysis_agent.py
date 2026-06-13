import asyncio
from langdetect import detect_langs
from app.core.logging import get_logger
from app.ai.groq_client import groq_client
from app.ai.ollama_client import ollama_client
from app.ai.model_router import TaskType, get_model
from app.db.repositories.article_repo import ArticleRepository
from app.db.models import Article

logger = get_logger(__name__)

async def analyze_article(article: Article, repo: ArticleRepository) -> dict:
    """Run language detection, translation (if non-English), sentiment, bias,
    summarization, and strategic scoring for an article, then save to db.
    """
    title = article.title
    content = article.content_raw or ""

    # Step 1: Language Detection
    original_language = "en"
    translated_title = title
    translated_content = content

    try:
        langs = detect_langs(content if content.strip() else title)
        if langs:
            top_lang = langs[0].lang
            prob = langs[0].prob
            if top_lang != "en" and prob > 0.8:
                original_language = top_lang
                logger.info("non_english_detected", article_id=article.id, lang=top_lang, prob=prob)
                # Run translation
                translated_title, translated_content = await _translate(title, content, top_lang)
    except Exception as e:
        logger.error("language_detection_failed", article_id=article.id, error=str(e))

    # We will analyze the translated (or original English) text
    text_to_analyze = f"Title: {translated_title}\n\nContent: {translated_content}"

    # Step 2: Sentiment, Bias, and Summarization in parallel
    sentiment_task = _analyze_sentiment(text_to_analyze)
    bias_task = _analyze_bias(text_to_analyze)
    summary_task = _analyze_summary(text_to_analyze)

    sentiment_res, bias_res, summary_res = await asyncio.gather(
        sentiment_task, bias_task, summary_task
    )

    # Step 3: Strategic Scorer (requires sentiment and summary)
    strategic_res = await _analyze_strategic_score(
        summary=summary_res.get("summary", ""),
        sentiment_label=sentiment_res.get("sentiment_label", "neutral"),
        text_content=text_to_analyze
    )

    analysis_data = {
        "sentiment_label": sentiment_res.get("sentiment_label", "neutral"),
        "sentiment_score": sentiment_res.get("sentiment_score", 0.0),
        "bias_label": bias_res.get("bias_label", "center"),
        "bias_score": bias_res.get("bias_score", 0.0),
        "summary": summary_res.get("summary", ""),
        "strategic_score": float(strategic_res.get("strategic_score", 50.0)),
        "risk_level": strategic_res.get("risk_level", "Medium"),
        "key_drivers": strategic_res.get("key_drivers", []),
        "affected_regions": strategic_res.get("affected_regions", []),
        "translated_title": translated_title if original_language != "en" else None,
        "translated_content": translated_content if original_language != "en" else None,
        "original_language": original_language
    }

    # Save to DB and assign backref relationship
    analysis = await repo.save_analysis(article.id, analysis_data)
    article.analysis = analysis

    return analysis_data

async def _translate(title: str, content: str, source_lang: str) -> tuple[str, str]:
    model, provider = get_model(TaskType.TRANSLATION)
    system_prompt = (
        "You are an expert translator. You translate text accurately into English.\n"
        "You must respond ONLY with a JSON object containing the keys:\n"
        "- 'translated_title': the English translation of the title\n"
        "- 'translated_content': the English translation of the content"
    )
    user_prompt = f"Source Language: {source_lang}\nTitle: {title}\nContent: {content}"

    try:
        if provider == "groq":
            res = await groq_client.chat_json(model, system_prompt, user_prompt, max_tokens=1500)
        else:
            prompt = f"{system_prompt}\n\nUser Content:\n{user_prompt}"
            res = await ollama_client.generate_json(model, prompt)

        return res.get("translated_title", title), res.get("translated_content", content)
    except Exception as e:
        logger.error("translation_failed", error=str(e))
        return title, content

async def _analyze_sentiment(text: str) -> dict:
    model, provider = get_model(TaskType.SENTIMENT)
    system_prompt = (
        "You are an expert financial and geopolitical analyst. Analyze the sentiment of the provided article.\n"
        "You must respond ONLY with a JSON object containing the keys:\n"
        "- 'sentiment_label': one of 'positive', 'neutral', 'negative'\n"
        "- 'sentiment_score': a float from -1.0 (extremely negative) to 1.0 (extremely positive)"
    )
    try:
        if provider == "groq":
            return await groq_client.chat_json(model, system_prompt, text, max_tokens=200)
        else:
            prompt = f"{system_prompt}\n\nUser Content:\n{text}"
            return await ollama_client.generate_json(model, prompt)
    except Exception as e:
        logger.error("sentiment_failed", error=str(e))
        return {}

async def _analyze_bias(text: str) -> dict:
    model, provider = get_model(TaskType.BIAS)
    system_prompt = (
        "You are an expert media analyst. Analyze the political and editorial bias of the provided article.\n"
        "You must respond ONLY with a JSON object containing the keys:\n"
        "- 'bias_label': one of 'left', 'left-center', 'center', 'right-center', 'right'\n"
        "- 'bias_score': a float from -1.0 (extreme left bias) to 1.0 (extreme right bias), with 0.0 representing center"
    )
    try:
        if provider == "groq":
            return await groq_client.chat_json(model, system_prompt, text, max_tokens=200)
        else:
            prompt = f"{system_prompt}\n\nUser Content:\n{text}"
            return await ollama_client.generate_json(model, prompt)
    except Exception as e:
        logger.error("bias_failed", error=str(e))
        return {}

async def _analyze_summary(text: str) -> dict:
    model, provider = get_model(TaskType.SUMMARIZATION)
    system_prompt = (
        "You are an expert editor. Provide a concise summary of the geopolitical event described in the article.\n"
        "You must respond ONLY with a JSON object containing the key:\n"
        "- 'summary': a brief, high-quality summary (2-3 sentences max)"
    )
    try:
        if provider == "groq":
            return await groq_client.chat_json(model, system_prompt, text, max_tokens=300)
        else:
            prompt = f"{system_prompt}\n\nUser Content:\n{text}"
            return await ollama_client.generate_json(model, prompt)
    except Exception as e:
        logger.error("summarization_failed", error=str(e))
        return {}

async def _analyze_strategic_score(summary: str, sentiment_label: str, text_content: str) -> dict:
    model, provider = get_model(TaskType.STRATEGIC_SCORING)
    system_prompt = (
        "You are a strategic intelligence analyst. Rate the geopolitical importance and strategic risk of the event.\n"
        "You must respond ONLY with a JSON object containing the keys:\n"
        "- 'strategic_score': an integer from 0 (completely irrelevant/noise) to 100 (critical global impact / outbreak of war)\n"
        "- 'risk_level': one of 'Low', 'Medium', 'High', 'Critical'\n"
        "- 'key_drivers': a list of strings representing the main geopolitical drivers/motives involved\n"
        "- 'affected_regions': a list of strings representing the regions or countries affected by this event"
    )
    user_prompt = f"Summary: {summary}\nSentiment: {sentiment_label}\nFull text: {text_content[:2000]}"
    try:
        if provider == "groq":
            return await groq_client.chat_json(model, system_prompt, user_prompt, max_tokens=300)
        else:
            prompt = f"{system_prompt}\n\nUser Content:\n{user_prompt}"
            return await ollama_client.generate_json(model, prompt)
    except Exception as e:
        logger.error("strategic_scoring_failed", error=str(e))
        return {}

# Celery wrapper
from app.core.celery_app import celery_app  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402

@celery_app.task(name="agents.analyze_article")
def analyze_article_task(article_id: str):
    import asyncio
    async def _run():
        from app.db.repositories.article_repo import ArticleRepository
        from app.db.models import Article
        from sqlalchemy import select

        async with SessionLocal() as db:
            repo = ArticleRepository(db)
            stmt = select(Article).where(Article.id == article_id)
            res = await db.execute(stmt)
            article = res.scalar_one_or_none()
            if article:
                await analyze_article(article, repo)
                await db.commit()
    asyncio.run(_run())
