import logging
import sys

from app.core.config import settings


def setup_logging() -> None:
    """
    Configure application logging.
    """

    logging.basicConfig(
        level=settings.LOG_LEVEL.upper(),
        format=(
            "%(asctime)s | "
            "%(levelname)s | "
            "%(name)s | "
            "%(message)s"
        ),
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )


def get_logger(name: str) -> logging.Logger:
    """
    Return logger instance.
    """

    return logging.getLogger(name)