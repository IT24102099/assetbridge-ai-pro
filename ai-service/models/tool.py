from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ToolStatus(str, Enum):
    SUCCESS = "Success"
    VALIDATION_FAILED = "ValidationFailed"
    EXECUTION_ERROR = "ExecutionError"
    DISALLOWED = "Disallowed"
    TIMED_OUT = "TimedOut"


class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    invoked_by_agent: str
    workflow_instance_id: str


class ToolCallResponse(BaseModel):
    tool_name: str
    status: ToolStatus
    result: Optional[Dict[str, Any]] = None
    duration_ms: int = 0
    error_message: Optional[str] = None
    executed_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
