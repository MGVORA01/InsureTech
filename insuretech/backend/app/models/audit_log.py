"""Audit mixin definitions for shared timestamp and user tracking columns."""

from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr
from sqlalchemy.sql import func


class AuditMixin:
    """Provides reusable audit columns for SQLAlchemy ORM models.

    Attributes:
        created_by (UUID | None): User identifier that created the record.
        updated_by (UUID | None): User identifier that last updated the record.
    """

    @declared_attr
    def created_by(cls):
        """Builds the `created_by` user identifier column.

        Returns:
            Column: Nullable UUID value for the record creator.
        """
        return Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)

    @declared_attr
    def updated_by(cls):
        """Builds the `updated_by` user identifier column.

        Returns:
            Column: Nullable UUID value for the last updater.
        """
        return Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    
class TimestampMixin:
    """Provides reusable timestamp columns for SQLAlchemy ORM models.

    Attributes:
        created_at (datetime): Timestamp when the record is created.
        updated_at (datetime | None): Timestamp when the record is last updated.
    """

    @declared_attr
    def created_at(cls):
        """Builds the `created_at` timestamp column.

        Returns:
            Column: Non-nullable timestamp with timezone for record creation.
        """
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @declared_attr
    def updated_at(cls):
        """Builds the `updated_at` timestamp column.

        Returns:
            Column: Nullable timestamp with timezone for last update.
        """
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    