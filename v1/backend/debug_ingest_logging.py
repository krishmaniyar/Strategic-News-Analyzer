import logging
import os
from datetime import datetime
from app.services.aggregator import Aggregator
from app.database import SessionLocal
from app.config import get_settings

# Create logs directory
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure logging
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_filename = f"logs/ingestion_{timestamp}.log"

# Force reconfiguration of logging
root_logger = logging.getLogger()
if root_logger.handlers:
    for handler in root_logger.handlers:
        root_logger.removeHandler(handler)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def run_debug_ingestion():
    settings = get_settings()
    logger.info(f"Starting debug ingestion at {datetime.now()}")
    logger.info(f"DEMO_MODE is set to: {settings.DEMO_MODE}")
    
    if settings.DEMO_MODE:
         logger.warning("DEMO_MODE is TRUE. Set it to FALSE in .env to use live API keys.")

    db = SessionLocal()
    try:
        aggregator = Aggregator(db)
        stats = aggregator.run_ingestion()
        logger.info(f"Ingestion finished successfully. Stats: {stats}")
    except Exception as e:
        logger.error(f"Ingestion failed with error: {e}", exc_info=True)
    finally:
        db.close()
        logger.info("Database session closed.")

if __name__ == "__main__":
    run_debug_ingestion()
