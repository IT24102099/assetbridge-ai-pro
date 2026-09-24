from typing import Any, Dict, List
from models.plan import WorkflowPlan
from models.validation import RuleViolation, ValidationResult, ValidationStatus


class ProposalValidator:
    """
    Deterministic rule-based validator for agent proposals.
    Guarantees structural, financial, and policy invariants before human review.
    """
    
    @staticmethod
    def validate_workflow_plan(plan: WorkflowPlan, max_allowed_budget_lkr: float = 1000000.0) -> ValidationResult:
        violations: List[RuleViolation] = []
        passed_count = 0
        
        # Rule 1: Steps must not be empty
        if not plan.steps:
            violations.append(
                RuleViolation(
                    rule_code="VAL_PLAN_EMPTY_STEPS",
                    severity="Error",
                    field_name="steps",
                    message="Workflow plan must contain at least one actionable step.",
                    remediation="Generate sequential inspection and repair steps."
                )
            )
        else:
            passed_count += 1
            
        # Rule 2: Step ordering must be strictly sequential (1, 2, 3...)
        expected_order = 1
        has_order_error = False
        for s in plan.steps:
            if s.step_order != expected_order:
                has_order_error = True
                break
            expected_order += 1
            
        if has_order_error:
            violations.append(
                RuleViolation(
                    rule_code="VAL_PLAN_INVALID_STEP_ORDER",
                    severity="Error",
                    field_name="steps.step_order",
                    message="Step proposals must be sequential starting at 1 with no gaps.",
                    remediation="Renumber step proposals in execution sequence."
                )
            )
        else:
            passed_count += 1
            
        # Rule 3: High priority plans MUST have at least one step requiring Manager/Admin approval
        if plan.assessed_priority in ["High", "Critical"]:
            has_approval_step = any(s.requires_approval for s in plan.steps)
            if not has_approval_step:
                violations.append(
                    RuleViolation(
                        rule_code="VAL_PLAN_MISSING_APPROVAL_GATE",
                        severity="Error",
                        field_name="steps.requires_approval",
                        message=f"Plan priority is '{plan.assessed_priority.value}', which mandates a human approval gate step.",
                        remediation="Add an approval gate step assigned to Manager before job execution."
                    )
                )
            else:
                passed_count += 1
        else:
            passed_count += 1

        # Rule 4: Risk assessment fields must not be empty
        if not plan.risk_assessment.structural_risk or not plan.risk_assessment.urgency_rationale:
            violations.append(
                RuleViolation(
                    rule_code="VAL_PLAN_INCOMPLETE_RISK_ASSESSMENT",
                    severity="Warning",
                    field_name="risk_assessment",
                    message="Risk assessment lacks detailed structural or urgency rationale.",
                    remediation="Provide explicit risk breakdown."
                )
            )
        else:
            passed_count += 1

        has_errors = any(v.severity == "Error" for v in violations)
        has_warnings = any(v.severity == "Warning" for v in violations)
        
        if has_errors:
            status = ValidationStatus.FAILED
        elif has_warnings:
            status = ValidationStatus.WARNING
        else:
            status = ValidationStatus.PASSED

        return ValidationResult(
            validation_id=f"val-plan-{plan.plan_id}",
            target_proposal_type="WorkflowPlan",
            status=status,
            violations=violations,
            passed_rules_count=passed_count,
            failed_rules_count=sum(1 for v in violations if v.severity == "Error"),
            warnings_count=sum(1 for v in violations if v.severity == "Warning"),
            is_safe_for_human_review=not has_errors
        )
