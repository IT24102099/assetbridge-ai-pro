from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from models.execution import ExecutionSummary, ToolExecutionRecord


class ExecutionContext(BaseModel):
    workflow_instance_id: str
    incident_id: str
    asset_id: str
    correlation_id: str = ""
    initiator_user_id: Optional[str] = None
    initiator_role: Optional[str] = None
    
    shared_data: Dict[str, Any] = Field(default_factory=dict)
    agent_summaries: List[ExecutionSummary] = Field(default_factory=list)
    created_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def append_agent_summary(self, summary: ExecutionSummary) -> None:
        self.agent_summaries.append(summary)
        if summary.structured_payload:
            self.shared_data[summary.agent_name] = summary.structured_payload
