from abc import ABC, abstractmethod
from typing import Any, Dict, Type
from pydantic import BaseModel
import time
from models.tool import ToolCallResponse, ToolStatus


class BaseTool(ABC):
    """
    Abstract base class for all allow-listed application tools.
    Enforces strict Pydantic input and output validation.
    Tools NEVER allow arbitrary SQL, shell execution, or filesystem operations.
    """
    name: str
    description: str
    input_schema: Type[BaseModel]
    output_schema: Type[BaseModel]
    
    @abstractmethod
    async def _run(self, validated_input: BaseModel) -> BaseModel:
        """
        Internal execution logic implemented by concrete tools.
        """
        pass
    
    async def execute(self, raw_arguments: Dict[str, Any]) -> ToolCallResponse:
        """
        Validated execution pipeline:
        1. Validate raw inputs against Pydantic input_schema
        2. Execute core logic with timing
        3. Validate and package structured output
        """
        start_time = time.perf_counter()
        
        # Step 1: Input schema validation
        try:
            validated_input = self.input_schema.model_validate(raw_arguments)
        except Exception as ex:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ToolCallResponse(
                tool_name=self.name,
                status=ToolStatus.VALIDATION_FAILED,
                result=None,
                duration_ms=duration_ms,
                error_message=f"Input validation failed: {str(ex)}"
            )
            
        # Step 2: Tool execution
        try:
            output_model = await self._run(validated_input)
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ToolCallResponse(
                tool_name=self.name,
                status=ToolStatus.SUCCESS,
                result=output_model.model_dump(),
                duration_ms=duration_ms,
                error_message=None
            )
        except Exception as ex:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ToolCallResponse(
                tool_name=self.name,
                status=ToolStatus.EXECUTION_ERROR,
                result=None,
                duration_ms=duration_ms,
                error_message=f"Tool execution failed: {str(ex)}"
            )
