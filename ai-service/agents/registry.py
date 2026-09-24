from typing import Dict, List, Optional
from .base import BaseAgent
from models.agent import AgentMetadata, AgentType


class AgentRegistry:
    """
    Registry for dynamic agent discovery, capabilities inspection, and invocation.
    """
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def register_agent(self, agent: BaseAgent) -> None:
        self._agents[agent.name] = agent

    def get_agent(self, agent_name: str) -> Optional[BaseAgent]:
        return self._agents.get(agent_name)

    def get_agent_by_type(self, agent_type: AgentType) -> Optional[BaseAgent]:
        for agent in self._agents.values():
            if agent.agent_type == agent_type:
                return agent
        return None

    def list_agents(self) -> List[AgentMetadata]:
        return [agent.get_metadata() for agent in self._agents.values()]


# Global default agent registry
global_agent_registry = AgentRegistry()
