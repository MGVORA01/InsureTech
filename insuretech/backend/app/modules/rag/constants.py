"""Constants for the RAG module."""

RAG_PREFIX = "/rag"
RAG_TAG = "RAG"
ASK_ROUTE = "/ask"

PROVIDER_GROQ = "groq"
PROVIDER_NONE = "none"
PROVIDER_ERROR = "error"

QUERY_EMPTY_MESSAGE = "Query cannot be empty"
NO_RELEVANT_DOCUMENTS_MESSAGE = "No relevant policy documents found for your query."
RAG_COMPLETED_MESSAGE = "RAG query completed"
RAG_LOG_MESSAGE = "RAG query: user=%s query=%s categories=%s"
LLM_ERROR_LOG_MESSAGE = "LLM generation failed: %s"
LLM_DISABLED_MESSAGE_TEMPLATE = (
    "Retrieved {chunk_count} relevant chunks. "
    "Add GROQ_API_KEY to .env to enable AI-generated answers."
)
LLM_FAILED_MESSAGE_TEMPLATE = (
    "Retrieved {chunk_count} chunks but LLM generation failed: {error}"
)

TEXT_KEY = "text"
METADATA_KEY = "metadata"
POLICY_NAME_KEY = "policy_name"
INSURER_KEY = "insurer"
INSURANCE_CATEGORY_KEY = "insurance_category"
SECTION_NAME_KEY = "section_name"
SECTION_TYPE_KEY = "section_type"
SIMILARITY_KEY = "similarity"
NOT_AVAILABLE_VALUE = "N/A"
EMPTY_VALUE = ""
CONTEXT_SEPARATOR = "\n\n"
USER_PROMPT_TEMPLATE = "Context:\n{context}\n\nQuestion: {question}"
CONTEXT_PART_TEMPLATE = (
    "[{index}] Policy: {policy_name} | Insurer: {insurer} | "
    "Section: {section_name}\n{text}"
)

SYSTEM_PROMPT = """You are an expert insurance policy analyst. Your role is to answer questions 
based strictly on the provided policy document excerpts.

Rules:
1. Answer ONLY using the provided context. If the context doesn't contain enough information, say so.
2. Always mention the specific policy name and insurer when referencing information.
3. If comparing policies across insurers, highlight key differences clearly.
4. Use simple language that a policyholder can understand.
5. Cite the section name for each piece of information you provide."""
