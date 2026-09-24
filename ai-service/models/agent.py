from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class AgentType(str, Enum):
    INCIDENT_PLANNING = "IncidentPlanning"
    PROVIDER_INTELLIGENCE = "ProviderIntelligence"
    COST_RECOMMENDATION = "CostRecommendation"
    VALIDATION_CONTINUITY = "ValidationContinuity"


class AgentRunStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "InProgress"
    SUCCESS = "Success"
    WARNING = "Warning"
    FAILED = "Failed"
    TIMED_OUT = "TimedOut"


class AgentRunRequest(BaseModel):
    """
    Standard request envelope passed from ASP.NET Core backend to run an internal agent.
    """
    workflow_instance_id: str = Field(..., description="GUID of the ASP.NET Core WorkflowInstance")
    incident_id: str = Field(..., description="GUID of the associated Incident")
    asset_id: str = Field(..., description="GUID of the associated Asset")
    correlation_id: str = Field(default="", description="Correlation ID for distributed tracing")
    requested_by_user_id: Optional[str] = Field(default=None, description="User ID of the initiator")
    user_role: Optional[str] = Field(default=None, description="Role of the initiator (Manager, Admin, etc.)")
    context_data: Dict[str, Any] = Field(default_factory=dict, description="Pre-loaded domain payload")


class AgentMetadata(BaseModel):
    name: str
    agent_type: AgentType
    description: str
    allowed_tools: List[str]
    timeout_seconds: float
    max_retries: int
