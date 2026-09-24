from typing import List, Optional
from .runner import AgentRunner
from .state import ExecutionContext
from agents.registry import AgentRegistry, global_agent_registry
from models.agent import AgentRunRequest, AgentRunStatus
from models.execution import ExecutionSummary


class MultiStepPipeline:
    """
    Sequential multi-step agent pipeline orchestrator.
    Passes contextual findings from one agent to the next while enforcing
    early termination on failure and preserving execution summaries.
    """
    def __init__(
        self,
        registry: Optional[AgentRegistry] = None,
        runner: Optional[AgentRunner] = None
    ):
        self.registry = registry or global_agent_registry
        self.runner = runner or AgentRunner()

    async def execute_chain(
        self,
        agent_names: List[str],
        initial_request: AgentRunRequest
    ) -> ExecutionContext:
        context = ExecutionContext(
            workflow_instance_id=initial_request.workflow_instance_id,
            incident_id=initial_request.incident_id,
            asset_id=initial_request.asset_id,
            correlation_id=initial_request.correlation_id,
            initiator_user_id=initial_request.requested_by_user_id,
            initiator_role=initial_request.user_role,
            shared_data=dict(initial_request.context_data)
        )

        for name in agent_names:
            agent = self.registry.get_agent(name)
            if not agent:
                error_summary = ExecutionSummary(
                    agent_run_id=f"run-missing-{name}",
                    workflow_instance_id=context.workflow_instance_id,
                    agent_name=name,
                    agent_type="Unknown", # type: ignore
                    status=AgentRunStatus.FAILED,
                    started_at_utc=context.created_at_utc,
                    completed_at_utc=context.created_at_utc,
                    duration_ms=0,
                    retry_count=0,
                    decision_summary=f"Pipeline aborted: Agent '{name}' is not registered in the system.",
                    structured_payload={},
                    tool_executions=[],
                    error_message=f"Agent '{name}' not found."
                )
                context.append_agent_summary(error_summary)
                break

            turn_request = AgentRunRequest(
                workflow_instance_id=context.workflow_instance_id,
                incident_id=context.incident_id,
                asset_id=context.asset_id,
                correlation_id=context.correlation_id,
                requested_by_user_id=context.initiator_user_id,
                user_role=context.initiator_role,
                context_data=context.shared_data
            )

            summary = await self.runner.run_with_retry(agent, turn_request)
            context.append_agent_summary(summary)

            if summary.status != AgentRunStatus.SUCCESS:
                break

        return context
