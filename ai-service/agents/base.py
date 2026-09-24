from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Set
import time
from datetime import datetime, timezone
from models.agent import AgentMetadata, AgentRunRequest, AgentRunStatus, AgentType
from models.execution import ExecutionSummary, ToolExecutionRecord
from models.tool import ToolCallResponse
from tools.registry import ToolRegistry, global_tool_registry


class BaseAgent(ABC):
    """
    Common conceptual contract for every AssetBridge AI specialized agent.
    Each agent has:
    - Unique agent name and type
    - Single, well-defined domain responsibility
    - Explicit allow-listed tools
    - Configured timeout and retry bounds
    - Safe failure and structured execution telemetry
    """
    name: str
    agent_type: AgentType
    description: str
    allowed_tools: List[str]
    timeout_seconds: float = 30.0
    max_retries: int = 3

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.tool_registry = tool_registry or global_tool_registry
        self._allowed_tool_set: Set[str] = set(self.allowed_tools)

    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name=self.name,
            agent_type=self.agent_type,
            description=self.description,
            allowed_tools=self.allowed_tools,
            timeout_seconds=self.timeout_seconds,
            max_retries=self.max_retries
        )

    async def invoke_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        trace_collector: Optional[List[ToolExecutionRecord]] = None
    ) -> ToolCallResponse:
        start_time = datetime.now(timezone.utc)
        perf_start = time.perf_counter()
        
        response = await self.tool_registry.invoke_tool(
            tool_name=tool_name,
            arguments=arguments,
            allowed_tools_for_agent=self._allowed_tool_set
        )
        
        perf_duration_ms = int((time.perf_counter() - perf_start) * 1000)
        end_time = datetime.now(timezone.utc)
        
        if trace_collector is not None:
            trace_collector.append(
                ToolExecutionRecord(
                    tool_name=tool_name,
                    started_at_utc=start_time,
                    completed_at_utc=end_time,
                    duration_ms=perf_duration_ms,
                    input_summary=str(arguments)[:250],
                    output_summary=str(response.result)[:250] if response.result else "",
                    status=response.status.value,
                    error_message=response.error_message
                )
            )
            
        return response

    @abstractmethod
    async def _execute_internal(
        self,
        request: AgentRunRequest,
        traces: List[ToolExecutionRecord]
    ) -> Dict[str, Any]:
        pass

    async def run(self, request: AgentRunRequest) -> ExecutionSummary:
        start_time = datetime.now(timezone.utc)
        perf_start = time.perf_counter()
        traces: List[ToolExecutionRecord] = []
        
        try:
            structured_result = await self._execute_internal(request, traces)
            perf_duration_ms = int((time.perf_counter() - perf_start) * 1000)
            end_time = datetime.now(timezone.utc)
            
            decision_summary = structured_result.get(
                "decision_summary",
                f"{self.name} completed successfully for workflow {request.workflow_instance_id}."
            )
            
            return ExecutionSummary(
                agent_run_id=f"run-{request.workflow_instance_id[:8]}-{int(time.time())}",
                workflow_instance_id=request.workflow_instance_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=AgentRunStatus.SUCCESS,
                started_at_utc=start_time,
                completed_at_utc=end_time,
                duration_ms=perf_duration_ms,
                retry_count=0,
                decision_summary=decision_summary,
                structured_payload=structured_result,
                tool_executions=traces,
                error_message=None
            )
        except Exception as ex:
            perf_duration_ms = int((time.perf_counter() - perf_start) * 1000)
            end_time = datetime.now(timezone.utc)
            
            return ExecutionSummary(
                agent_run_id=f"run-{request.workflow_instance_id[:8]}-{int(time.time())}",
                workflow_instance_id=request.workflow_instance_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=AgentRunStatus.FAILED,
                started_at_utc=start_time,
                completed_at_utc=end_time,
                duration_ms=perf_duration_ms,
                retry_count=0,
                decision_summary=f"Agent execution failed safely: {str(ex)}",
                structured_payload={},
                tool_executions=traces,
                error_message=str(ex)
            )
