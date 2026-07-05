"""Constants for the contact module."""

from datetime import timedelta

RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW = timedelta(minutes=15)

CONTACT_PREFIX = "/contact"
CONTACT_TAG = "contact"
CONTACT_SUBMIT_ROUTE = ""
UNKNOWN_CLIENT_IP = "unknown"

TOO_MANY_REQUESTS_MESSAGE = "Too many requests. Please try again in 15 minutes."
CONTACT_SUBMITTED_MESSAGE = "Message sent successfully."
