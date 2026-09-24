from typing import List, Optional
from pydantic import BaseModel, Field
from ..base import BaseTool
from models.recommendation import QuotationAnalysis, MaintenanceRecommendation


# --- 1. GetInspection Tool ---
class GetInspectionInput(BaseModel):
    inspection_id: str = Field(..., description="Inspection GUID")


class FindingItem(BaseModel):
    finding_id: str
    component_name: str
    defect_description: str
    severity: str
    recommended_action: str


class GetInspectionOutput(BaseModel):
    inspection_id: str
    incident_id: str
    inspector_name: str
    inspection_date_utc: str
    findings: List[FindingItem]


class GetInspectionTool(BaseTool):
    name = "GetInspection"
    description = "Retrieves on-site inspection findings, structural defect classifications, and repair recommendations."
    input_schema = GetInspectionInput
    output_schema = GetInspectionOutput

    async def _run(self, validated_input: GetInspectionInput) -> GetInspectionOutput:
        return GetInspectionOutput(
            inspection_id=validated_input.inspection_id,
            incident_id="incident-01",
            inspector_name="Sunil Jayawardena",
            inspection_date_utc="2026-09-16T12:00:00Z",
            findings=[
                FindingItem(
                    finding_id="find-01",
                    component_name="Roof Terracotta Ridge Tiles",
                    defect_description="Cracked mortar bedding along main ridge allowing monsoon runoff ingress.",
                    severity="High",
                    recommended_action="Re-bed ridge tiles with waterproof polymer mortar and install SBS underlay."
                )
            ]
        )


# --- 2. GetMaintenanceHistory Tool ---
class GetMaintenanceHistoryInput(BaseModel):
    asset_id: str = Field(..., description="Asset GUID")


class PastJobItem(BaseModel):
    job_id: str
    title: str
    actual_cost_lkr: float
    completed_at_utc: str
    warranty_expiry_utc: Optional[str] = None


class GetMaintenanceHistoryOutput(BaseModel):
    asset_id: str
    total_lifetime_spent_lkr: float
    completed_jobs: List[PastJobItem]


class GetMaintenanceHistoryTool(BaseTool):
    name = "GetMaintenanceHistory"
    description = "Fetches property maintenance expenditure history and warranty coverage status."
    input_schema = GetMaintenanceHistoryInput
    output_schema = GetMaintenanceHistoryOutput

    async def _run(self, validated_input: GetMaintenanceHistoryInput) -> GetMaintenanceHistoryOutput:
        return GetMaintenanceHistoryOutput(
            asset_id=validated_input.asset_id,
            total_lifetime_spent_lkr=185000.0,
            completed_jobs=[
                PastJobItem(
                    job_id="job-past-01",
                    title="External wall damp proofing",
                    actual_cost_lkr=48000.0,
                    completed_at_utc="2025-11-20T10:00:00Z",
                    warranty_expiry_utc="2027-11-20T10:00:00Z"
                )
            ]
        )


# --- 3. GetQuotations Tool ---
class GetQuotationsInput(BaseModel):
    incident_id: str = Field(..., description="Incident GUID")


class QuotationSummary(BaseModel):
    quotation_id: str
    provider_id: str
    provider_name: str
    total_amount_lkr: float
    estimated_days: int
    warranty_months: int
    line_item_count: int


class GetQuotationsOutput(BaseModel):
    incident_id: str
    quotations: List[QuotationSummary]


class GetQuotationsTool(BaseTool):
    name = "GetQuotations"
    description = "Retrieves all submitted contractor quotations and pricing breakdowns for an incident."
    input_schema = GetQuotationsInput
    output_schema = GetQuotationsOutput

    async def _run(self, validated_input: GetQuotationsInput) -> GetQuotationsOutput:
        return GetQuotationsOutput(
            incident_id=validated_input.incident_id,
            quotations=[
                QuotationSummary(
                    quotation_id="quote-01",
                    provider_id="prov-colombo-01",
                    provider_name="Lanka Roof Masters & Waterproofing",
                    total_amount_lkr=58000.0,
                    estimated_days=3,
                    warranty_months=12,
                    line_item_count=4
                ),
                QuotationSummary(
                    quotation_id="quote-02",
                    provider_id="prov-colombo-02",
                    provider_name="Cinnamon Builders & Restorations",
                    total_amount_lkr=72000.0,
                    estimated_days=5,
                    warranty_months=6,
                    line_item_count=5
                )
            ]
        )


# --- 4. CompareQuotations Tool ---
class CompareQuotationsInput(BaseModel):
    incident_id: str
    quotation_ids: List[str]
    estimated_budget_lkr: float


class CompareQuotationsOutput(BaseModel):
    incident_id: str
    best_value_quotation_id: str
    analyses: List[QuotationAnalysis]
    comparison_summary: str


class CompareQuotationsTool(BaseTool):
    name = "CompareQuotations"
    description = "Audits quotation line items, compares unit rates, and ranks candidate bids against benchmark costs."
    input_schema = CompareQuotationsInput
    output_schema = CompareQuotationsOutput

    async def _run(self, validated_input: CompareQuotationsInput) -> CompareQuotationsOutput:
        analyses = [
            QuotationAnalysis(
                quotation_id="quote-01",
                provider_name="Lanka Roof Masters & Waterproofing",
                total_amount_lkr=58000.0,
                is_within_budget=58000.0 <= validated_input.estimated_budget_lkr,
                budget_variance_percentage=round(((58000.0 - validated_input.estimated_budget_lkr) / validated_input.estimated_budget_lkr) * 100, 1),
                item_count=4,
                has_labor_breakdown=True,
                warranty_months=12,
                audit_notes=["Line items match Colombo market benchmarks", "Includes 12-month water leak guarantee"]
            ),
            QuotationAnalysis(
                quotation_id="quote-02",
                provider_name="Cinnamon Builders & Restorations",
                total_amount_lkr=72000.0,
                is_within_budget=72000.0 <= validated_input.estimated_budget_lkr,
                budget_variance_percentage=round(((72000.0 - validated_input.estimated_budget_lkr) / validated_input.estimated_budget_lkr) * 100, 1),
                item_count=5,
                has_labor_breakdown=True,
                warranty_months=6,
                audit_notes=["Exceeds preliminary estimated budget", "Material rate markup +18% above standard"]
            )
        ]
        return CompareQuotationsOutput(
            incident_id=validated_input.incident_id,
            best_value_quotation_id="quote-01",
            analyses=analyses,
            comparison_summary="Quote 01 is 10.8% below budget with twice the warranty protection."
        )


# --- 5. CheckBudget Tool ---
class CheckBudgetInput(BaseModel):
    proposed_cost_lkr: float = Field(..., ge=0)
    authorized_budget_lkr: float = Field(..., ge=0)


class CheckBudgetOutput(BaseModel):
    is_within_budget: bool
    variance_amount_lkr: float
    variance_percentage: float
    requires_budget_escalation: bool


class CheckBudgetTool(BaseTool):
    name = "CheckBudget"
    description = "Checks whether a proposed expenditure fits within pre-approved owner/manager budget thresholds."
    input_schema = CheckBudgetInput
    output_schema = CheckBudgetOutput

    async def _run(self, validated_input: CheckBudgetInput) -> CheckBudgetOutput:
        diff = validated_input.proposed_cost_lkr - validated_input.authorized_budget_lkr
        variance_pct = round((diff / validated_input.authorized_budget_lkr) * 100, 2) if validated_input.authorized_budget_lkr > 0 else 0.0
        return CheckBudgetOutput(
            is_within_budget=diff <= 0,
            variance_amount_lkr=round(diff, 2),
            variance_percentage=variance_pct,
            requires_budget_escalation=diff > 0
        )


# --- 6. CalculateTotalCost Tool ---
class LineItem(BaseModel):
    description: str
    unit_price: float
    quantity: float


class CalculateTotalCostInput(BaseModel):
    line_items: List[LineItem]
    contingency_percentage: float = Field(default=5.0, ge=0, le=25.0)


class CalculateTotalCostOutput(BaseModel):
    subtotal_lkr: float
    contingency_amount_lkr: float
    grand_total_lkr: float


class CalculateTotalCostTool(BaseTool):
    name = "CalculateTotalCost"
    description = "Computes subtotal and contingency calculations with high precision."
    input_schema = CalculateTotalCostInput
    output_schema = CalculateTotalCostOutput

    async def _run(self, validated_input: CalculateTotalCostInput) -> CalculateTotalCostOutput:
        subtotal = sum(item.unit_price * item.quantity for item in validated_input.line_items)
        contingency = subtotal * (validated_input.contingency_percentage / 100.0)
        return CalculateTotalCostOutput(
            subtotal_lkr=round(subtotal, 2),
            contingency_amount_lkr=round(contingency, 2),
            grand_total_lkr=round(subtotal + contingency, 2)
        )


# --- 7. GetWarrantyInformation Tool ---
class GetWarrantyInformationInput(BaseModel):
    provider_id: str
    work_category: str


class GetWarrantyInformationOutput(BaseModel):
    standard_warranty_months: int
    warranty_terms: str
    post_repair_inspection_recommended: bool


class GetWarrantyInformationTool(BaseTool):
    name = "GetWarrantyInformation"
    description = "Fetches standard warranty periods and terms for specific contractor trades in Sri Lanka."
    input_schema = GetWarrantyInformationInput
    output_schema = GetWarrantyInformationOutput

    async def _run(self, validated_input: GetWarrantyInformationInput) -> GetWarrantyInformationOutput:
        return GetWarrantyInformationOutput(
            standard_warranty_months=12,
            warranty_terms="Full leak-free guarantee covering materials and workmanship for 12 months.",
            post_repair_inspection_recommended=True
        )
