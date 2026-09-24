from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from ..base import BaseTool
from models.plan import PriorityLevel, RiskAssessment, StepProposal, WorkflowPlan


# --- 1. GetAsset Tool ---
class GetAssetInput(BaseModel):
    asset_id: str = Field(..., description="Asset GUID")


class GetAssetOutput(BaseModel):
    asset_id: str
    title: str
    property_type: str
    city: str
    district: str
    address: str
    year_built: Optional[int] = None
    is_active: bool = True


class GetAssetTool(BaseTool):
    name = "GetAsset"
    description = "Retrieves structural and location details for a specific property asset."
    input_schema = GetAssetInput
    output_schema = GetAssetOutput

    async def _run(self, validated_input: GetAssetInput) -> GetAssetOutput:
        return GetAssetOutput(
            asset_id=validated_input.asset_id,
            title="Colombo Colonial Villa",
            property_type="ResidentialVilla",
            city="Colombo",
            district="Colombo",
            address="45 Flower Road, Cinnamon Gardens, Colombo 07",
            year_built=2012,
            is_active=True
        )


# --- 2. GetIncident Tool ---
class GetIncidentInput(BaseModel):
    incident_id: str = Field(..., description="Incident GUID")


class GetIncidentOutput(BaseModel):
    incident_id: str
    asset_id: str
    title: str
    description: str
    category: str
    reported_priority: str
    status: str
    estimated_budget_lkr: float
    reported_at_utc: str


class GetIncidentTool(BaseTool):
    name = "GetIncident"
    description = "Retrieves reported incident details, issue description, and preliminary budget."
    input_schema = GetIncidentInput
    output_schema = GetIncidentOutput

    async def _run(self, validated_input: GetIncidentInput) -> GetIncidentOutput:
        return GetIncidentOutput(
            incident_id=validated_input.incident_id,
            asset_id="asset-colombo-01",
            title="Severe Roof Leakage in Master Bedroom",
            description="Heavy monsoon rain caused ceiling water penetration and wall dampness.",
            category="RoofingAndWaterproofing",
            reported_priority="High",
            status="Reported",
            estimated_budget_lkr=65000.0,
            reported_at_utc="2026-09-16T10:00:00Z"
        )


# --- 3. GetAssetHistory Tool ---
class GetAssetHistoryInput(BaseModel):
    asset_id: str = Field(..., description="Asset GUID")
    limit: int = Field(default=5, ge=1, le=20)


class AssetHistoryItem(BaseModel):
    event_type: str
    description: str
    timestamp_utc: str


class GetAssetHistoryOutput(BaseModel):
    asset_id: str
    history_events: List[AssetHistoryItem]


class GetAssetHistoryTool(BaseTool):
    name = "GetAssetHistory"
    description = "Fetches historical maintenance and inspection timeline events for continuity awareness."
    input_schema = GetAssetHistoryInput
    output_schema = GetAssetHistoryOutput

    async def _run(self, validated_input: GetAssetHistoryInput) -> GetAssetHistoryOutput:
        return GetAssetHistoryOutput(
            asset_id=validated_input.asset_id,
            history_events=[
                AssetHistoryItem(
                    event_type="MaintenanceCompleted",
                    description="Gutter cleaning and rainwater downpipe replacement",
                    timestamp_utc="2026-03-10T14:30:00Z"
                ),
                AssetHistoryItem(
                    event_type="InspectionConducted",
                    description="Annual pre-monsoon roof inspection",
                    timestamp_utc="2025-10-15T09:00:00Z"
                )
            ]
        )


# --- 4. GetIncidentEvidence Tool ---
class GetIncidentEvidenceInput(BaseModel):
    incident_id: str = Field(..., description="Incident GUID")


class EvidenceItem(BaseModel):
    evidence_id: str
    evidence_type: str
    file_url: str
    caption: str


class GetIncidentEvidenceOutput(BaseModel):
    incident_id: str
    evidence_count: int
    items: List[EvidenceItem]


class GetIncidentEvidenceTool(BaseTool):
    name = "GetIncidentEvidence"
    description = "Fetches uploaded photos, videos, and inspection documents linked to an incident."
    input_schema = GetIncidentEvidenceInput
    output_schema = GetIncidentEvidenceOutput

    async def _run(self, validated_input: GetIncidentEvidenceInput) -> GetIncidentEvidenceOutput:
        return GetIncidentEvidenceOutput(
            incident_id=validated_input.incident_id,
            evidence_count=2,
            items=[
                EvidenceItem(
                    evidence_id="ev-01",
                    evidence_type="Photo",
                    file_url="https://storage.assetbridge.lk/evidence/ceiling-damp.jpg",
                    caption="Ceiling plaster peeling and active water discoloration"
                ),
                EvidenceItem(
                    evidence_id="ev-02",
                    evidence_type="Photo",
                    file_url="https://storage.assetbridge.lk/evidence/roof-tile.jpg",
                    caption="Displaced terracotta roof tiles near chimney flashing"
                )
            ]
        )


# --- 5. CreateWorkflowPlan Tool ---
class CreateWorkflowPlanInput(BaseModel):
    workflow_instance_id: str
    incident_category: str
    assessed_priority: PriorityLevel
    estimated_cost_range_lkr: str
    structural_risk: str
    financial_risk: str
    urgency_rationale: str
    steps: List[StepProposal]


class CreateWorkflowPlanTool(BaseTool):
    name = "CreateWorkflowPlan"
    description = "Packages a validated multi-step maintenance plan for backend review."
    input_schema = CreateWorkflowPlanInput
    output_schema = WorkflowPlan

    async def _run(self, validated_input: CreateWorkflowPlanInput) -> WorkflowPlan:
        return WorkflowPlan(
            plan_id=f"plan-{validated_input.workflow_instance_id[:8]}",
            workflow_instance_id=validated_input.workflow_instance_id,
            incident_category=validated_input.incident_category,
            assessed_priority=validated_input.assessed_priority,
            estimated_cost_range_lkr=validated_input.estimated_cost_range_lkr,
            risk_assessment=RiskAssessment(
                structural_risk=validated_input.structural_risk,
                financial_risk=validated_input.financial_risk,
                urgency_rationale=validated_input.urgency_rationale
            ),
            steps=validated_input.steps
        )
