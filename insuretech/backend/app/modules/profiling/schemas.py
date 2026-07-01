"""Pydantic schemas for the profiling module."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class OptionItem(BaseModel):
    """A single option within a question's options list."""

    label: str
    value: str


class QuestionOut(BaseModel):
    """Schema for a profiling question returned to the frontend."""

    id: UUID
    unified_id: str
    question_text: str
    section: str
    question_type: str
    options: list[OptionItem] | None = None
    applicable_segment: str
    is_conditional: bool
    parent_question_id: UUID | None = None
    parent_answer_value: str | None = None
    tier: int = 1
    order_index: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator("options", mode="before")
    @classmethod
    def validate_options(cls, v: Any) -> Any:
        """Convert raw JSON options to a list of OptionItem instances.

        Supports both a plain string array and an array of
        ``{"label": ..., "value": ...}`` dicts.
        """
        if v is None:
            return None
        if isinstance(v, list):
            items: list[OptionItem] = []
            for item in v:
                if isinstance(item, dict) and "label" in item and "value" in item:
                    items.append(OptionItem(label=item["label"], value=item["value"]))
                elif isinstance(item, str):
                    items.append(OptionItem(label=item, value=item))
                else:
                    items.append(OptionItem(label=str(item), value=str(item)))
            return items
        return v


class ProfilingSessionOut(BaseModel):
    """Schema for a profiling session response."""

    id: UUID
    business_id: UUID
    status: str
    current_section: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfilingAnswerCreate(BaseModel):
    """Request schema for submitting an answer during profiling."""

    question_id: UUID
    answer_value: str
    advance_to_section: str | None = None


class ProfilingAnswerBatchCreate(BaseModel):
    """Request schema for submitting multiple answers."""

    answers: list[ProfilingAnswerCreate]
    advance_to_section: str | None = None


class ProfilingAnswerOut(BaseModel):
    """Schema for a single profiling answer response."""

    id: UUID
    session_id: UUID
    question_id: UUID
    answer_value: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskScoreOut(BaseModel):
    """Schema for a computed risk score per category."""

    risk_category_name: str
    score: float
    risk_level: str
    factor_breakdown: dict[str, float] | None = None


class SectionQuestionsOut(BaseModel):
    """Schema for the questions and state of a single wizard section."""

    section: str
    section_index: int
    total_sections: int
    questions: list[QuestionOut]
    answers: dict[str, str]
    session: ProfilingSessionOut


class ProfilingCompleteOut(BaseModel):
    """Schema returned when a profiling session is completed."""

    session: ProfilingSessionOut
    scores: list[RiskScoreOut]


class PreviewScoreOut(BaseModel):
    """Schema for a single category's preview score (not persisted)."""

    risk_category_name: str
    score: float
    risk_level: str
    factor_breakdown: dict[str, float] | None = None
    has_tier2_questions: bool = False


class PreviewScoresOut(BaseModel):
    """Schema returned for preview scoring before Tier 2 refinement."""

    scores: list[PreviewScoreOut]
    has_high_risk: bool


class Tier2QuestionOut(BaseModel):
    """Schema for a Tier 2 refinement question with its context."""

    question: QuestionOut
    risk_category_name: str
    factor_name: str
    current_risk_level: str
