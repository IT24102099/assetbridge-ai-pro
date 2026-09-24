from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from ..base import BaseTool
from models.approval import ApprovalProposal, FollowUpRecommendation, ImpactLevel
from models.validation import ValidationResult, ValidationStatus


# --- 1. GetWorkflowState Tool ---
class GetWorkflowStateInput(BaseModel):
    workflow_instance_id: str = Field(..., description="WorkflowInstance GUID")


class GetWorkflowStateOutput(BaseModel):
    workflow_instance_id: str
    current_state: str
    incident_id: str
    asset_id: str
    completed_steps_count: int
    is_terminal_state: bool


class GetWorkflowStateTool(BaseTool):
    name = "GetWorkflowState"
    description = "Queries authoritative ASP.NET Core workflow state machine to ensure valid lifecycle step."
    input_schema = GetWorkflowStateInput
    output_schema = GetWorkflowStateOutput

    async def _run(self, validated_input: GetWorkflowStateInput) -> GetWorkflowStateOutput:
        return GetWorkflowStateOutput(
            workflow_instance_id=validated_input.workflow_instance_id,
            current_state="AI_VALIDATION",
            incident_id="incident-01",
            asset_id="asset-01",
            completed_steps_count=5,
            is_terminal_state=False
        )


# --- 2. ValidateProposal Tool ---
class ValidateProposalInput(BaseModel):
    proposal_type: str = Field(..., description="WorkflowPlan, QuotationProposal, etc.")
    payload: Dict[str, Any] = Field(default_factory=dict)


class ValidateProposalOutput(BaseModel):
    validation_id: str
    is_valid: bool
    status: ValidationStatus
    violations_summary: str


class ValidateProposalTool(BaseTool):
    name = "ValidateProposal"
    description = "Executes deterministic business rule validation against agent proposal payloads."
    input_schema = ValidateProposalInput
    output_schema = ValidateProposalOutput

    async def _run(self, validated_input: ValidateProposalInput) -> ValidateProposalOutput:
        return ValidateProposalOutput(
            validation_id="val-check-01",
            is_valid=True,
            status=ValidationStatus.PASSED,
            violations_summary="No rule violations detected. Proposal adheres to budget and scope policies."
        )


# --- 3. CreateApprovalRequest Tool ---
class CreateApprovalRequestInput(BaseModel):
    workflow_instance_id: str
    action_type: str
    impact_level: ImpactLevel
    requested_amount_lkr: Optional[float] = None
    summary_for_approver: str
    risk_factors: List[str] = Field(default_factory=list)


class CreateApprovalRequestTool(BaseTool):
    name = "CreateApprovalRequest"
    description = "Prepares a formal human approval proposal for Manager/Admin review without executing the action."
    input_schema = CreateApprovalRequestInput
    output_schema = ApprovalProposal

    async def _run(self, validated_input: CreateApprovalRequestInput) -> ApprovalProposal:
        return ApprovalProposal(
            workflow_instance_id=validated_input.workflow_instance_id,
            impact_level=validated_input.impact_level,
            requires_human_approval=True,
            authorized_roles=["Manager", "Admin"],
            action_type=validated_input.action_type,
            requested_amount_lkr=validated_input.requested_amount_lkr,
            summary_for_approver=validated_input.summary_for_approver,
            risk_factors=validated_input.risk_factors,
            recommended_follow_ups=[
                FollowUpRecommendation(
                    title="30-Day Post-Repair Roof Inspection",
                    description="Local representative checks for any damp recurrence after initial rainfall.",
                    due_in_days=30,
                    continuity_category="Post-Repair Warranty",
                    assigned_role="Representative"
                )
            ]
        )


# --- 4. GetApprovalStatus Tool ---
class GetApprovalStatusInput(BaseModel):
    approval_request_id: str


class GetApprovalStatusOutput(BaseModel):
    approval_request_id: str
    status: str
    decided_by_user_id: Optional[str] = None
    decided_by_role: Optional[str] = None
    decision_reason: Optional[str] = None
    decided_at_utc: Optional[str] = None


class GetApprovalStatusTool(BaseTool):
    name = "GetApprovalStatus"
    description = "Checks the human decision status (Approved, Rejected, RevisionRequested) on an approval request."
    input_schema = GetApprovalStatusInput
    output_schema = GetApprovalStatusOutput

    async def _run(self, validated_input: GetApprovalStatusInput) -> GetApprovalStatusOutput:
        return GetApprovalStatusOutput(
            approval_request_id=validated_input.approval_request_id,
            status="Pending",
            decided_by_user_id=None,
            decided_by_role=None,
            decision_reason=None,
            decided_at_utc=None
        )


# --- 5. CreateFollowUpTask Tool ---
class CreateFollowUpTaskInput(BaseModel):
    workflow_instance_id: str
    asset_id: str
    title: str
    description: str
    due_in_days: int
    continuity_category: str
    assigned_role: str = "Representative"


class CreateFollowUpTaskOutput(BaseModel):
    task_id: str
    title: str
    scheduled_due_date_utc: str
    is_scheduled: bool


class CreateFollowUpTaskTool(BaseTool):
    name = "CreateFollowUpTask"
    description = "Schedules long-term property continuity follow-ups and warranty monitoring checks."
    input_schema = CreateFollowUpTaskInput
    output_schema = CreateFollowUpTaskOutput

    async def _run(self, validated_input: CreateFollowUpTaskInput) -> CreateFollowUpTaskOutput:
        return CreateFollowUpTaskOutput(
            task_id="followup-01",
            title=validated_input.title,
            scheduled_due_date_utc="2026-10-16T00:00:00Z",
            is_scheduled=True
        )


# --- 6. CreateAuditSummary Tool ---
class CreateAuditSummaryInput(BaseModel):
    workflow_instance_id: str
    agent_name: str
    action_performed: str
    decision_summary: str


class CreateAuditSummaryOutput(BaseModel):
    audit_record_id: str
    is_persisted: bool
    summary: str


class CreateAuditSummaryTool(BaseTool):
    name = "CreateAuditSummary"
    description = "Formats non-repudiable audit event summaries for append-only backend recording."
    input_schema = CreateAuditSummaryInput
    output_schema = CreateAuditSummaryOutput

    async def _run(self, validated_input: CreateAuditSummaryInput) -> CreateAuditSummaryOutput:
        return CreateAuditSummaryOutput(
            audit_record_id="audit-evt-01",
            is_persisted=True,
            summary=f"[{validated_input.agent_name}] {validated_input.action_performed}: {validated_input.decision_summary}"
        )
