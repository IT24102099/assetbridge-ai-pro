from typing import Any, Dict, List, Optional, Set
from .base import BaseTool
from models.tool import ToolCallResponse, ToolStatus


class ToolRegistry:
    """
    Central registry for allow-listed application tools.
    Strictly validates tool registration and blocks disallowed tool requests.
    """
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        
    def register_tool(self, tool: BaseTool) -> None:
        """Register an allow-listed tool."""
        self._tools[tool.name] = tool
        
    def get_tool(self, tool_name: str) -> Optional[BaseTool]:
        return self._tools.get(tool_name)
        
    def list_tools(self) -> List[str]:
        return list(self._tools.keys())
        
    def is_tool_allowed(self, tool_name: str, allowed_set: Set[str]) -> bool:
        return tool_name in self._tools and tool_name in allowed_set
        
    async def invoke_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        allowed_tools_for_agent: Set[str]
    ) -> ToolCallResponse:
        """
        Invokes a tool only if it is both registered and present in the agent's allow-list.
        """
        if tool_name not in self._tools:
            return ToolCallResponse(
                tool_name=tool_name,
                status=ToolStatus.DISALLOWED,
                error_message=f"Tool '{tool_name}' is not registered in the system."
            )
            
        if tool_name not in allowed_tools_for_agent:
            return ToolCallResponse(
                tool_name=tool_name,
                status=ToolStatus.DISALLOWED,
                error_message=f"Security violation: Tool '{tool_name}' is not permitted for this agent."
            )
            
        tool = self._tools[tool_name]
        return await tool.execute(arguments)


# Global default registry instance
global_tool_registry = ToolRegistry()
