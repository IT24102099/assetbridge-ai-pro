import pytest
import pytest_asyncio
from agents.registry import global_agent_registry
from models.agent import AgentRunRequest, AgentRunStatus
from orchestration.runner import AgentRunner
from orchestration.workflow_orchestrator import global_orchestrator
from rag import KnowledgeDomain, global_rag_engine
from tools.registry import global_tool_registry


@pytest.mark.asyncio
async def test_all_four_agents_registered():
    """Verify all 4 specialized agents are registered and healthy."""
    agents = global_agent_registry.list_agents()
    assert len(agents) == 4
    agent_names = {a.name for a in agents}
    expected = {
        "IncidentPlanningAgent",
        "ProviderIntelligenceAgent",
        "CostRecommendationAgent",
        "ValidationContinuityAgent"
    }
    assert agent_names == expected


@pytest.mark.asyncio
async def test_four_rag_collections_indexed_from_pdfs():
    """Verify physical PDF documents are indexed across all 4 domain collections."""
    docs = global_rag_engine.get_all_documents()
    assert len(docs) == 8
    
    # Check each domain has indexed documents
    incident_docs = [d for d in docs if d.domain == KnowledgeDomain.INCIDENT_KNOWLEDGE]
    provider_docs = [d for d in docs if d.domain == KnowledgeDomain.PROVIDER_KNOWLEDGE]
    maintenance_docs = [d for d in docs if d.domain == KnowledgeDomain.MAINTENANCE_KNOWLEDGE]
    governance_docs = [d for d in docs if d.domain == KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE]

    assert len(incident_docs) >= 2
    assert len(provider_docs) >= 2
    assert len(maintenance_docs) >= 2
    assert len(governance_docs) >= 2


@pytest.mark.asyncio
async def test_agent1_incident_planning_execution_and_rag():
    """Verify Agent 1 executes, uses INCIDENT_KNOWLEDGE RAG, and produces workflow plan."""
    agent = global_agent_registry.get_agent("IncidentPlanningAgent")
    runner = AgentRunner()
    req = AgentRunRequest(workflow_instance_id="wf-001", asset_id="ast-001", incident_id="inc-001")
    
    res = await runner.run_with_retry(agent, req)
    assert res.status == AgentRunStatus.SUCCESS
    assert res.structured_payload.get("rag_collection") == KnowledgeDomain.INCIDENT_KNOWLEDGE.value
    assert len(res.structured_payload.get("rag_sources", [])) > 0
    assert "workflow_plan" in res.structured_payload


@pytest.mark.asyncio
async def test_agent2_provider_intelligence_execution_and_rag():
    """Verify Agent 2 executes, uses PROVIDER_KNOWLEDGE RAG, and ranks providers."""
    agent = global_agent_registry.get_agent("ProviderIntelligenceAgent")
    runner = AgentRunner()
    req = AgentRunRequest(workflow_instance_id="wf-001", asset_id="ast-001", incident_id="inc-001")
    
    res = await runner.run_with_retry(agent, req)
    assert res.status == AgentRunStatus.SUCCESS
    assert res.structured_payload.get("rag_collection") == KnowledgeDomain.PROVIDER_KNOWLEDGE.value
    assert "recommended_provider_id" in res.structured_payload


@pytest.mark.asyncio
async def test_agent3_cost_recommendation_execution_and_rag():
    """Verify Agent 3 executes, uses MAINTENANCE_KNOWLEDGE RAG, and validates budget."""
    agent = global_agent_registry.get_agent("CostRecommendationAgent")
    runner = AgentRunner()
    req = AgentRunRequest(workflow_instance_id="wf-001", asset_id="ast-001", incident_id="inc-001")
    
    res = await runner.run_with_retry(agent, req)
    assert res.status == AgentRunStatus.SUCCESS
    assert res.structured_payload.get("rag_collection") == KnowledgeDomain.MAINTENANCE_KNOWLEDGE.value
    assert res.structured_payload.get("is_within_budget") is True


@pytest.mark.asyncio
async def test_agent4_validation_and_human_approval_gating():
    """Verify Agent 4 prepares ApprovalRequest and does NOT self-approve."""
    agent = global_agent_registry.get_agent("ValidationContinuityAgent")
    runner = AgentRunner()
    req = AgentRunRequest(workflow_instance_id="wf-001", asset_id="ast-001", incident_id="inc-001")
    
    res = await runner.run_with_retry(agent, req)
    assert res.status == AgentRunStatus.SUCCESS
    assert res.structured_payload.get("rag_collection") == KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE.value
    assert res.structured_payload.get("human_approval_required") is True
    assert res.structured_payload.get("approval_status") == "PendingManagerApproval"
    assert res.structured_payload.get("follow_up_scheduled") is True


@pytest.mark.asyncio
async def test_tool_allowlist_enforcement():
    """Verify disallowed tools are rejected by the Tool Execution Gateway."""
    allowed_tools = {"GetAsset", "GetIncident"}
    res = await global_tool_registry.invoke_tool(
        tool_name="GetQuotations",
        arguments={"incident_id": "inc-001"},
        allowed_tools_for_agent=allowed_tools
    )
    assert res.status.value == "Disallowed"
    assert "not permitted" in res.error_message


@pytest.mark.asyncio
async def test_full_four_agent_end_to_end_orchestration():
    """Verify end-to-end multi-agent orchestration pipeline."""
    result = await global_orchestrator.orchestrate_full_workflow(
        workflow_instance_id="wf-e2e-100",
        asset_id="ast-100",
        incident_id="inc-100"
    )
    assert result.status == "SUCCESS"
    assert result.executed_agents_count == 4
    assert result.approval_request is not None
    assert result.approval_request.get("human_approval_required") is True
    assert result.governance_status == "AwaitingManagerApproval"
