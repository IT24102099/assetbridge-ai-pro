import asyncio
import pytest
from agents.base import BaseAgent
from models.agent import AgentRunRequest, AgentRunStatus, AgentType
from models.execution import ToolExecutionRecord
from orchestration.runner import AgentRunner


class FailingFlakyAgent(BaseAgent):
    name = "FailingFlakyAgent"
    agent_type = AgentType.INCIDENT_PLANNING
    description = "Test agent designed to simulate failures and retries."
    allowed_tools = ["GetAsset"]
    timeout_seconds = 0.5
    max_retries = 2

    def __init__(self, fail_count: int = 2):
        super().__init__()
        self.fail_count = fail_count
        self.attempts = 0

    async def _execute_internal(self, request: AgentRunRequest, traces: list[ToolExecutionRecord]):
        self.attempts += 1
        if self.attempts <= self.fail_count:
            raise RuntimeError(f"Simulated network failure on attempt {self.attempts}")
        return {"decision_summary": "Recovered on retry!"}


class SlowHangingAgent(BaseAgent):
    name = "SlowHangingAgent"
    agent_type = AgentType.INCIDENT_PLANNING
    description = "Test agent that exceeds execution timeout."
    allowed_tools = []
    timeout_seconds = 0.2
    max_retries = 1

    async def _execute_internal(self, request: AgentRunRequest, traces: list[ToolExecutionRecord]):
        await asyncio.sleep(1.0)
        return {"decision_summary": "Should not reach here"}


@pytest.mark.asyncio
async def test_agent_runner_recovers_after_retry(sample_incident_request: AgentRunRequest):
    agent = FailingFlakyAgent(fail_count=2)
    runner = AgentRunner(initial_backoff_seconds=0.05)
    
    summary = await runner.run_with_retry(agent, sample_incident_request, max_retries=3)
    assert summary.status == AgentRunStatus.SUCCESS
    assert summary.retry_count == 2
    assert "Recovered on retry!" in summary.decision_summary


@pytest.mark.asyncio
async def test_agent_runner_safe_failure_on_exhausted_retries(sample_incident_request: AgentRunRequest):
    agent = FailingFlakyAgent(fail_count=5)
    runner = AgentRunner(initial_backoff_seconds=0.02)
    
    summary = await runner.run_with_retry(agent, sample_incident_request, max_retries=2)
    assert summary.status == AgentRunStatus.FAILED
    assert summary.error_message is not None
    assert "Safe Failure" in summary.decision_summary


@pytest.mark.asyncio
async def test_agent_runner_safe_failure_on_timeout(sample_incident_request: AgentRunRequest):
    agent = SlowHangingAgent()
    runner = AgentRunner(default_timeout_seconds=0.2, max_retries=0)
    
    summary = await runner.run_with_retry(agent, sample_incident_request)
    assert summary.status == AgentRunStatus.FAILED
    assert "timed out" in summary.error_message
