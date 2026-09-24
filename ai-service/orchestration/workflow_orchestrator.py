import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from agents.registry import global_agent_registry
from models.agent import AgentRunRequest, AgentRunStatus
from models.execution import ExecutionSummary
from orchestration.runner import AgentRunner


class MultiAgentWorkflowResult(BaseModel):
    workflow_instance_id: str
    asset_id: str
    incident_id: str
    status: str
    total_duration_ms: int
    executed_agents_count: int
    agent_summaries: List[ExecutionSummary] = Field(default_factory=list)
    final_proposal: Dict[str, Any] = Field(default_factory=dict)
    approval_request: Optional[Dict[str, Any]] = None
    follow_up_scheduled: bool = False
    governance_status: str = "AwaitingManagerApproval"
    created_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkflowOrchestrator:
    """
    Coordinates the end-to-end 4-Agent pipeline:
    IncidentPlanning -> ProviderIntelligence -> CostRecommendation -> ValidationContinuity
    """

    def __init__(self, runner: Optional[AgentRunner] = None):
        self.runner = runner or AgentRunner()

    async def orchestrate_full_workflow(
        self,
        workflow_instance_id: str,
        asset_id: str,
        incident_id: str,
        caller_user_id: Optional[str] = None
    ) -> MultiAgentWorkflowResult:
        start_time = datetime.now(timezone.utc)
        perf_start = time.perf_counter()

        request = AgentRunRequest(
            workflow_instance_id=workflow_instance_id,
            asset_id=asset_id,
            incident_id=incident_id,
            caller_user_id=caller_user_id or "usr-mgr-001"
        )

        agent_names = [
            "IncidentPlanningAgent",
            "ProviderIntelligenceAgent",
            "CostRecommendationAgent",
            "ValidationContinuityAgent"
        ]

        summaries: List[ExecutionSummary] = []
        accumulated_payload: Dict[str, Any] = {}

        for name in agent_names:
            agent = global_agent_registry.get_agent(name)
            if not agent:
                raise ValueError(f"Agent '{name}' is not registered in AI service.")

            summary = await self.runner.run_with_retry(agent, request)
            summaries.append(summary)

            if summary.status != AgentRunStatus.SUCCESS:
                # Controlled safe abort on agent failure
                total_duration_ms = int((time.perf_counter() - perf_start) * 1000)
                return MultiAgentWorkflowResult(
                    workflow_instance_id=workflow_instance_id,
                    asset_id=asset_id,
                    incident_id=incident_id,
                    status="FAILED",
                    total_duration_ms=total_duration_ms,
                    executed_agents_count=len(summaries),
                    agent_summaries=summaries,
                    final_proposal=accumulated_payload,
                    governance_status=f"AbortedAt_{name}"
                )

            accumulated_payload[name] = summary.structured_payload

        total_duration_ms = int((time.perf_counter() - perf_start) * 1000)
        val_agent_payload = accumulated_payload.get("ValidationContinuityAgent", {})

        return MultiAgentWorkflowResult(
            workflow_instance_id=workflow_instance_id,
            asset_id=asset_id,
            incident_id=incident_id,
            status="SUCCESS",
            total_duration_ms=total_duration_ms,
            executed_agents_count=len(summaries),
            agent_summaries=summaries,
            final_proposal=accumulated_payload,
            approval_request={
                "approval_id": val_agent_payload.get("approval_request_id", "appr-001"),
                "status": "PendingManagerApproval",
                "proposed_amount_lkr": 68000.0,
                "human_approval_required": True
            },
            follow_up_scheduled=val_agent_payload.get("follow_up_scheduled", True),
            governance_status="AwaitingManagerApproval"
        )


global_orchestrator = WorkflowOrchestrator()
