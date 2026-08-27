# app/schemas/common.py
"""Common API response schemas."""

from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

DataT = TypeVar('DataT')


class APIResponse(BaseModel, Generic[DataT]):
    """
    Standard API response model for all endpoints.
    
    Attributes:
        success: Boolean indicating if request was successful
        error: Error message if any, None on success
        message: Success or info message
        data: Response payload data
    """
    success: Optional[bool] = None
    error: Optional[str] = None
    message: Optional[str] = None
    data: Optional[DataT] = None

    @classmethod
    def success_response(
        cls, 
        message: str, 
        data: Optional[DataT] = None
    ) -> "APIResponse[DataT]":
        """Create a standardized success response."""
        return cls(
            success=True,
            error=None,
            message=message,
            data=data
        )

    @classmethod
    def error_response(
        cls,
        message: str,
        data: Optional[DataT] = None,
    ) -> "APIResponse[DataT]":
        """Create a standardized error response."""
        return cls(
            success=False,
            error=message,
            message=None,
            data=data
        )
