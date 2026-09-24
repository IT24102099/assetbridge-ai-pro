import pytest
from agents.registry import global_agent_registry
from models.agent import AgentRunRequest, AgentRunStatus, AgentType


def test_agent_registry_contains_all_four_agents():
    agents = global_agent_registry.list_agents()
    assert len(agents) == 4
    
    agent_names = {a.name for a in agents}
    assert "IncidentPlanningAgent" in agent_names
    assert "ProviderIntelligenceAgent" in agent_names
    assert "CostRecommendationAgent" in agent_names
    assert "ValidationContinuityAgent" in agent_names


def test_agent_contracts_have_unique_types_and_responsibilities():
    agents = global_agent_registry.list_agents()
    agent_types = {a.agent_type for a in agents}
    assert len(agent_types) == 4
    
    for a in agents:
        assert len(a.allowed_tools) > 0
        assert a.timeout_seconds > 0
        assert a.max_retries >= 1
        assert len(a.description) > 15


@pytest.mark.asyncio
async def test_incident_planning_agent_run(sample_incident_request: AgentRunRequest):
    agent = global_agent_registry.get_agent("IncidentPlanningAgent")
    assert agent is not None
    
    summary = await agent.run(sample_incident_request)
    assert summary.status == AgentRunStatus.SUCCESS
    assert summary.agent_name == "IncidentPlanningAgent"
    assert summary.workflow_instance_id == sample_incident_request.workflow_instance_id
    assert len(summary.tool_executions) >= 4
    assert "workflow_plan" in summary.structured_payload


@pytest.mark.asyncio
async def test_provider_intelligence_agent_run(sample_incident_request: AgentRunRequest):
    agent = global_agent_registry.get_agent("ProviderIntelligenceAgent")
    assert agent is not None
    
    summary = await agent.run(sample_incident_request)
    assert summary.status == AgentRunStatus.SUCCESS
    assert summary.agent_name == "ProviderIntelligenceAgent"
    assert "provider_match_proposal" in summary.structured_payload
    proposal = summary.structured_payload["provider_match_proposal"]
    assert len(proposal["ranked_candidates"]) > 0


@pytest.mark.asyncio
async def test_cost_recommendation_agent_run(sample_incident_request: AgentRunRequest):
    agent = global_agent_registry.get_agent("CostRecommendationAgent")
    assert agent is not None
    
    summary = await agent.run(sample_incident_request)
    assert summary.status == AgentRunStatus.SUCCESS
    assert summary.agent_name == "CostRecommendationAgent"
    assert "maintenance_recommendation" in summary.structured_payload
    rec = summary.structured_payload["maintenance_recommendation"]
    assert rec["recommended_amount_lkr"] <= sample_incident_request.context_data["estimated_budget_lkr"]


@pytest.mark.asyncio
async def test_validation_continuity_agent_run(sample_incident_request: AgentRunRequest):
    agent = global_agent_registry.get_agent("ValidationContinuityAgent")
    assert agent is not None
    
    summary = await agent.run(sample_incident_request)
    assert summary.status == AgentRunStatus.SUCCESS
    assert summary.agent_name == "ValidationContinuityAgent"
    assert "approval_proposal" in summary.structured_payload
    assert "continuity_task" in summary.structured_payload
    approval = summary.structured_payload["approval_proposal"]
    assert approval["requires_human_approval"] is True
