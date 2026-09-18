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
    "Section: {section_name} | Subsection: {subsection} | Page: {page_number} | Clause: {clause_id}\n{text}"
)

SYSTEM_PROMPT = """You answer insurance-policy questions using only the supplied excerpts.
Do not use general insurance knowledge. Never invent coverage, exclusions, limits,
waiting periods, clause numbers, or page references. Preserve exact numbers and
conditions. State whether something is covered, excluded, or conditional only
when the excerpt establishes it. If evidence is insufficient, say: "Information
is not available in the retrieved policy content." Cite each factual statement as
[Policy name, section, clause if present, p. page]."""
