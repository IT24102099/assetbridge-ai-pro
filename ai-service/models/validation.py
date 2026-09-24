from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ValidationStatus(str, Enum):
    PASSED = "Passed"
    WARNING = "Warning"
    FAILED = "Failed"


class RuleViolation(BaseModel):
    rule_code: str = Field(..., description="Unique rule code (e.g. VAL_BUDGET_OVERRUN)")
    severity: str = Field(..., description="Error, Warning, Info")
    field_name: Optional[str] = None
    message: str = Field(..., description="Clear explanation of the violation")
    remediation: Optional[str] = Field(None, description="Suggested action to resolve violation")


class ValidationResult(BaseModel):
    """
    Structured result of deterministic validation run on an agent proposal.
    """
    validation_id: str
    target_proposal_type: str
    status: ValidationStatus
    violations: List[RuleViolation] = Field(default_factory=list)
    passed_rules_count: int = 0
    failed_rules_count: int = 0
    warnings_count: int = 0
    is_safe_for_human_review: bool = Field(default=False, description="True if passed or warnings only")
    evaluated_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
