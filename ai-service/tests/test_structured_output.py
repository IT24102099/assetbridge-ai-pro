import pytest
from models.plan import WorkflowPlan, StepProposal, RiskAssessment, PriorityLevel
from models.validation import ValidationStatus
from validators.proposal_validator import ProposalValidator


def test_workflow_plan_pydantic_validation_success():
    plan = WorkflowPlan(
        plan_id="plan-01",
        workflow_instance_id="wf-01",
        incident_category="Plumbing",
        assessed_priority=PriorityLevel.HIGH,
        estimated_cost_range_lkr="30,000 - 45,000",
        risk_assessment=RiskAssessment(
            structural_risk="Low",
            financial_risk="Low",
            urgency_rationale="Pipe leak in bathroom"
        ),
        steps=[
            StepProposal(
                step_order=1,
                step_name="Inspection",
                action_description="Plumber checks water pipe joint",
                assigned_role="Representative",
                estimated_duration_hours=2.0,
                requires_approval=False
            ),
            StepProposal(
                step_order=2,
                step_name="Approval",
                action_description="Manager approves quotation",
                assigned_role="Manager",
                estimated_duration_hours=6.0,
                requires_approval=True
            )
        ]
    )
    
    validation = ProposalValidator.validate_workflow_plan(plan)
    assert validation.status == ValidationStatus.PASSED
    assert validation.is_safe_for_human_review is True
    assert validation.failed_rules_count == 0


def test_workflow_plan_validation_fails_on_missing_approval_for_high_priority():
    plan = WorkflowPlan(
        plan_id="plan-02",
        workflow_instance_id="wf-02",
        incident_category="Roofing",
        assessed_priority=PriorityLevel.CRITICAL,
        estimated_cost_range_lkr="100,000 - 150,000",
        risk_assessment=RiskAssessment(
            structural_risk="High",
            financial_risk="High",
            urgency_rationale="Collapsing ceiling"
        ),
        steps=[
            StepProposal(
                step_order=1,
                step_name="Direct Fix",
                action_description="Contractor begins repair immediately without oversight",
                assigned_role="ServiceProvider",
                estimated_duration_hours=48.0,
                requires_approval=False
            )
        ]
    )
    
    validation = ProposalValidator.validate_workflow_plan(plan)
    assert validation.status == ValidationStatus.FAILED
    assert validation.is_safe_for_human_review is False
    assert any(v.rule_code == "VAL_PLAN_MISSING_APPROVAL_GATE" for v in validation.violations)
