import asyncio
import time
from datetime import datetime, timezone
from typing import Optional
from agents.base import BaseAgent
from models.agent import AgentRunRequest, AgentRunStatus
from models.execution import ExecutionSummary


class AgentRunner:
    """
    Executes an agent with explicit timeout bounds, exponential backoff retries,
    and safe non-crashing failure envelopes.
    """
    def __init__(
        self,
        default_timeout_seconds: float = 30.0,
        max_retries: int = 3,
        initial_backoff_seconds: float = 0.5
    ):
        self.default_timeout_seconds = default_timeout_seconds
        self.max_retries = max_retries
        self.initial_backoff_seconds = initial_backoff_seconds

    async def run_with_retry(
        self,
        agent: BaseAgent,
        request: AgentRunRequest,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None
    ) -> ExecutionSummary:
        effective_timeout = timeout_seconds or agent.timeout_seconds or self.default_timeout_seconds
        effective_max_retries = max_retries if max_retries is not None else agent.max_retries or self.max_retries
        
        attempt = 0
        last_error: Optional[str] = None
        start_time = datetime.now(timezone.utc)
        perf_start = time.perf_counter()
        
        while attempt <= effective_max_retries:
            attempt += 1
            try:
                summary = await asyncio.wait_for(
                    agent.run(request),
                    timeout=effective_timeout
                )
                
                if summary.status == AgentRunStatus.SUCCESS:
                    summary.retry_count = attempt - 1
                    return summary
                else:
                    last_error = summary.error_message or "Agent returned failure status."
            except asyncio.TimeoutError:
                last_error = f"Agent execution timed out after {effective_timeout}s."
            except Exception as ex:
                last_error = f"Unhandled agent exception: {str(ex)}"
                
            if attempt <= effective_max_retries:
                backoff = self.initial_backoff_seconds * (2 ** (attempt - 1))
                await asyncio.sleep(backoff)

        perf_duration_ms = int((time.perf_counter() - perf_start) * 1000)
        return ExecutionSummary(
            agent_run_id=f"run-{request.workflow_instance_id[:8]}-exhausted",
            workflow_instance_id=request.workflow_instance_id,
            agent_name=agent.name,
            agent_type=agent.agent_type,
            status=AgentRunStatus.FAILED,
            started_at_utc=start_time,
            completed_at_utc=datetime.now(timezone.utc),
            duration_ms=perf_duration_ms,
            retry_count=attempt - 1,
            decision_summary=f"Safe Failure: Agent {agent.name} failed after {attempt - 1} retries. Reason: {last_error}",
            structured_payload={},
            tool_executions=[],
            error_message=last_error
        )
