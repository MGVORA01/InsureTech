"""Constants for chat workflows."""

CHAT_PREFIX = "/chat"
CHAT_TAG = "Chat"

CHAT_ROUTE = ""

EMBEDDING_MODEL_NAME = "all-mpnet-base-v2"
ANSWER_GENERATED_MESSAGE = "Answer generated"
ANSWER_GENERATED_SUCCESS_MESSAGE = "Answer generated successfully"
PDF_PROCESSED_MESSAGE = "PDF processed successfully"
NO_ANSWER_FALLBACK_MESSAGE = (
    "Sorry, I'm unable to answer this question. Please contact our support team "
    "through the website and they'll help you directly."
)
FILE_NOT_FOUND_MESSAGE_TEMPLATE = "File not found: {file_path}"
NO_TEXT_EXTRACTED_MESSAGE = "No text extracted from PDF"

READ_BINARY_MODE = "rb"
ROLE_KEY = "role"
CONTENT_KEY = "content"
SYSTEM_ROLE = "system"
USER_ROLE = "user"
CONTEXT_SEPARATOR = "\n\n"
SOURCE_TEMPLATE = "Page {page}: {text}..."
SOURCE_TEXT_LIMIT = 150
CHUNK_TEXT_KEY = "chunk_text"
PAGE_NUMBER_KEY = "page_number"
EMBEDDING_KEY = "embedding"
CHUNK_INDEX_KEY = "chunk_index"
DEFAULT_CHUNK_LIMIT = 5
SPLITTER_CHUNK_SIZE = 500
SPLITTER_CHUNK_OVERLAP = 100
