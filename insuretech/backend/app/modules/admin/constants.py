"""Constants for admin workflows."""

import os

from app.shared.constants import ADMIN_ROLE, USER_ROLE_NAME

PDFS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chat", "pdfs")

ADMIN_PREFIX = "/admin"
ADMIN_TAG = "admin"

STATS_ROUTE = "/stats"
USERS_ROUTE = "/users"
DOCUMENTS_ROUTE = "/documents"
DOCUMENT_DETAIL_ROUTE = "/documents/{document_id}"
USER_STATUS_ROUTE = "/users/{user_id}/status"
UPLOAD_ROUTE = "/upload"
UPLOAD_FILE_ROUTE = "/upload/file"

DEFAULT_ROLE_NAME = USER_ROLE_NAME
DOCUMENT_TYPE_KNOWLEDGE_BASE = "knowledge_base"
PDF_EXTENSION = ".pdf"
WRITE_BINARY_MODE = "wb"

DASHBOARD_STATS_FETCHED_MESSAGE = "Dashboard stats fetched successfully"
USERS_FETCHED_MESSAGE = "Users fetched successfully"
PDF_ONLY_MESSAGE = "Only PDF files are allowed"
USER_NOT_FOUND_MESSAGE = "User not found"
USER_STATUS_UPDATED_MESSAGE = "User status updated successfully"
DOCUMENTS_FETCHED_MESSAGE = "Documents fetched successfully"
DOCUMENT_NOT_FOUND_MESSAGE = "Document not found"
DOCUMENT_DELETED_MESSAGE_TEMPLATE = "'{file_name}' deleted successfully"

USERS_KEY = "users"
TOTAL_KEY = "total"
PAGE_KEY = "page"
LIMIT_KEY = "limit"
CREATED_AT_FIELD = "created_at"
UPDATED_AT_FIELD = "updated_at"
CHUNKS_COUNT_LABEL = "chunks_count"
TOTAL_USERS_KEY = "total_users"
ACTIVE_USERS_KEY = "active_users"
INACTIVE_USERS_KEY = "inactive_users"
TOTAL_POLICIES_KEY = "total_policies"
TOTAL_INSURERS_KEY = "total_insurers"
TOTAL_CATEGORIES_KEY = "total_categories"
