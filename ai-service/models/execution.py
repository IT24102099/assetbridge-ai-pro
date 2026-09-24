from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from .agent import AgentRunStatus, AgentType


class ToolExecutionRecord(BaseModel):
    tool_name: str
    started_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at_utc: Optional[datetime] = None
    duration_ms: Optional[int] = None
    input_summary: str
    output_summary: str
    status: str = "Success"
    validation_result: Optional[str] = None
    error_message: Optional[str] = None


class ExecutionSummary(BaseModel):
    """
    Standard agent execution telemetry summary returned to ASP.NET Core backend.
    Maps directly to ASP.NET Core AgentRun & ToolExecution entities.
    """
    agent_run_id: str
    workflow_instance_id: str
    agent_name: str
    agent_type: AgentType
    status: AgentRunStatus
    started_at_utc: datetime
    completed_at_utc: Optional[datetime] = None
    duration_ms: Optional[int] = None
    retry_count: int = 0
    decision_summary: str = Field(..., description="High-level structured decision summary (NO raw CoT)")
    structured_payload: Dict[str, Any] = Field(default_factory=dict)
    tool_executions: List[ToolExecutionRecord] = Field(default_factory=list)
    error_message: Optional[str] = None
