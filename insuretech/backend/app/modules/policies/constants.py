"""Constants for policy workflows."""

POLICIES_PREFIX = "/policies"
POLICIES_TAG = "policies"
ADMIN_ROLE = "ADMIN"

INSURERS_ROUTE = "/insurers"
INSURER_DETAIL_ROUTE = "/insurers/{insurer_id}"
CATEGORIES_ROUTE = "/categories"
CATEGORY_DETAIL_ROUTE = "/categories/{category_id}"
POLICIES_ROUTE = ""
POLICY_DETAIL_ROUTE = "/{policy_id}"
POLICY_UPLOAD_ROUTE = "/{policy_id}/upload"

INSURERS_RETRIEVED_MESSAGE = "Insurers retrieved"
INSURER_CREATED_MESSAGE = "Insurer created"
INSURER_UPDATED_MESSAGE = "Insurer updated"
INSURER_DELETED_MESSAGE = "Insurer deleted"
INSURER_NOT_FOUND_MESSAGE = "Insurer not found"
INSURER_HAS_POLICIES_MESSAGE = (
    "Cannot delete insurer with active policies. Delete the policies first."
)

CATEGORIES_RETRIEVED_MESSAGE = "Categories retrieved"
CATEGORY_CREATED_MESSAGE = "Category created"
CATEGORY_UPDATED_MESSAGE = "Category updated"
CATEGORY_DELETED_MESSAGE = "Category deleted"
CATEGORY_NOT_FOUND_MESSAGE = "Category not found"
CATEGORY_HAS_POLICIES_MESSAGE = (
    "Cannot delete category with active policies. Delete the policies first."
)
INSURANCE_CATEGORY_NOT_FOUND_MESSAGE = "Insurance category not found"

POLICIES_RETRIEVED_MESSAGE = "Policies retrieved"
POLICY_RETRIEVED_MESSAGE = "Policy retrieved"
POLICY_CREATED_MESSAGE = "Policy created"
POLICY_UPDATED_MESSAGE = "Policy updated"
POLICY_DELETED_MESSAGE = "Policy deleted"
POLICY_NOT_FOUND_MESSAGE = "Policy not found"
POLICY_PDF_UPLOADED_MESSAGE = "PDF uploaded and ingested"

NO_FIELDS_TO_UPDATE_MESSAGE = "No fields to update"
PDF_ONLY_MESSAGE = "Only PDF files are allowed"
EMPTY_FILE_MESSAGE = "Empty file"
CLOUDINARY_NOT_CONFIGURED_LOG_MESSAGE = (
    "Cloudinary not configured; file stored locally as: %s"
)
CLOUDINARY_UPLOAD_FAILED_LOG_MESSAGE = (
    "Cloudinary upload failed, file stored locally as: %s. Error: %s"
)

EMPTY_VALUE = ""
PDF_EXTENSION = ".pdf"
LOCAL_FILE_URL_TEMPLATE = "local://{file_name}"
HTTP_PREFIX = "http"
SEARCH_PATTERN_TEMPLATE = "%{search}%"
POLICY_WORDING_DOC_TYPE = "policy_wording"

INSURER_ID_FIELD = "insurer_id"
INSURANCE_CATEGORY_ID_FIELD = "insurance_category_id"
