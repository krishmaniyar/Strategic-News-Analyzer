import logging
import sys
import structlog
from app.core.config import settings

def setup_logging():
    # Configure standard library logging
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    # Processors for structlog
    processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.environment == "development":
        # Colorful console formatting in dev
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    else:
        # JSON formatting in production
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Apply configuration to root logger
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

def get_logger(name: str):
    return structlog.get_logger(name)
