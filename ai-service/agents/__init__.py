from .base import BaseAgent
from .registry import AgentRegistry, global_agent_registry
from .incident_planning import IncidentPlanningAgent
from .provider_intelligence import ProviderIntelligenceAgent
from .cost_recommendation import CostRecommendationAgent
from .validation_continuity import ValidationContinuityAgent

# Register the four specialized agents
_agents = [
    IncidentPlanningAgent(),
    ProviderIntelligenceAgent(),
    CostRecommendationAgent(),
    ValidationContinuityAgent(),
]

for _a in _agents:
    global_agent_registry.register_agent(_a)

__all__ = [
    "BaseAgent",
    "AgentRegistry",
    "global_agent_registry",
    "IncidentPlanningAgent",
    "ProviderIntelligenceAgent",
    "CostRecommendationAgent",
    "ValidationContinuityAgent",
]
