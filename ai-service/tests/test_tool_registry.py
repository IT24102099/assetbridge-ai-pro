import pytest
from models.tool import ToolStatus
from tools.registry import global_tool_registry


def test_tool_registry_contains_expected_tools():
    tools = global_tool_registry.list_tools()
    expected_tools = [
        "GetAsset", "GetIncident", "GetAssetHistory", "GetIncidentEvidence", "CreateWorkflowPlan",
        "FindProviders", "GetProviderDetails", "GetProviderHistory", "CheckAvailability", "CalculateDistance", "FindRepresentative",
        "GetInspection", "GetMaintenanceHistory", "GetQuotations", "CompareQuotations", "CheckBudget", "CalculateTotalCost", "GetWarrantyInformation",
        "GetWorkflowState", "ValidateProposal", "CreateApprovalRequest", "GetApprovalStatus", "CreateFollowUpTask", "CreateAuditSummary"
    ]
    for expected in expected_tools:
        assert expected in tools, f"Missing tool: {expected}"


@pytest.mark.asyncio
async def test_tool_allowlist_enforcement_rejects_unpermitted_tool():
    allowed_tools = {"GetAsset", "GetIncident"}
    
    response = await global_tool_registry.invoke_tool(
        tool_name="CompareQuotations",
        arguments={"incident_id": "inc-01", "quotation_ids": [], "estimated_budget_lkr": 50000.0},
        allowed_tools_for_agent=allowed_tools
    )
    
    assert response.status == ToolStatus.DISALLOWED
    assert "Security violation" in response.error_message


@pytest.mark.asyncio
async def test_invalid_tool_input_validation_rejection():
    response = await global_tool_registry.invoke_tool(
        tool_name="GetAsset",
        arguments={},
        allowed_tools_for_agent={"GetAsset"}
    )
    
    assert response.status == ToolStatus.VALIDATION_FAILED
    assert "Input validation failed" in response.error_message


@pytest.mark.asyncio
async def test_arbitrary_unregistered_tool_rejection():
    response = await global_tool_registry.invoke_tool(
        tool_name="ExecuteArbitrarySQLQuery",
        arguments={"query": "DROP TABLE Users;"},
        allowed_tools_for_agent={"ExecuteArbitrarySQLQuery"}
    )
    
    assert response.status == ToolStatus.DISALLOWED
    assert "not registered" in response.error_message
