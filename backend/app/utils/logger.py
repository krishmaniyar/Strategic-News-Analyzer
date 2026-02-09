import logging
import os
import sys
from datetime import datetime

def setup_logging(log_dir_name="logs"):
    """
    Sets up logging to write to a timestamped session directory.
    """
    # Create base log directory if it doesn't exist
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    log_root = os.path.join(base_dir, log_dir_name)
    os.makedirs(log_root, exist_ok=True)

    # Create timestamped session directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_dir = os.path.join(log_root, f"session_{timestamp}")
    os.makedirs(session_dir, exist_ok=True)

    log_file = os.path.join(session_dir, "backend.log")

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove existing handlers to avoid duplicates
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)

    # File Handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Stream Handler (Console)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    root_logger.addHandler(stream_handler)

    logging.info(f"Logging initialized. Writing logs to: {log_file}")
    
    return log_file
