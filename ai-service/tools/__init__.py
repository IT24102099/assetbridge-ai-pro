from .base import BaseTool
from .registry import ToolRegistry, global_tool_registry
from .definitions import (
    GetAssetTool,
    GetIncidentTool,
    GetAssetHistoryTool,
    GetIncidentEvidenceTool,
    CreateWorkflowPlanTool,
    FindProvidersTool,
    GetProviderDetailsTool,
    GetProviderHistoryTool,
    CheckAvailabilityTool,
    CalculateDistanceTool,
    FindRepresentativeTool,
    GetInspectionTool,
    GetMaintenanceHistoryTool,
    GetQuotationsTool,
    CompareQuotationsTool,
    CheckBudgetTool,
    CalculateTotalCostTool,
    GetWarrantyInformationTool,
    GetWorkflowStateTool,
    ValidateProposalTool,
    CreateApprovalRequestTool,
    GetApprovalStatusTool,
    CreateFollowUpTaskTool,
    CreateAuditSummaryTool,
)

# Register all standard application tools into global registry
_default_tools = [
    GetAssetTool(),
    GetIncidentTool(),
    GetAssetHistoryTool(),
    GetIncidentEvidenceTool(),
    CreateWorkflowPlanTool(),
    FindProvidersTool(),
    GetProviderDetailsTool(),
    GetProviderHistoryTool(),
    CheckAvailabilityTool(),
    CalculateDistanceTool(),
    FindRepresentativeTool(),
    GetInspectionTool(),
    GetMaintenanceHistoryTool(),
    GetQuotationsTool(),
    CompareQuotationsTool(),
    CheckBudgetTool(),
    CalculateTotalCostTool(),
    GetWarrantyInformationTool(),
    GetWorkflowStateTool(),
    ValidateProposalTool(),
    CreateApprovalRequestTool(),
    GetApprovalStatusTool(),
    CreateFollowUpTaskTool(),
    CreateAuditSummaryTool(),
]

for _t in _default_tools:
    global_tool_registry.register_tool(_t)

__all__ = [
    "BaseTool",
    "ToolRegistry",
    "global_tool_registry",
]
