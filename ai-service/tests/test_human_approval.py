import pytest
from models.approval import ImpactLevel
from validators.safety_guard import SafetyGuard


def test_safety_guard_blocks_auto_execution_for_high_impact_actions():
    high_impact_actions = [
        "ApproveQuotationAndAuthorizeExecution",
        "AuthorizeContractorPayout",
        "OverrideBudgetLimit",
        "SignOffJobCompletion"
    ]
    
    for action in high_impact_actions:
        assert SafetyGuard.can_auto_execute(action, requested_amount_lkr=10000.0) is False
        impact = SafetyGuard.evaluate_action_impact(action, requested_amount_lkr=10000.0)
        assert impact in [ImpactLevel.HIGH, ImpactLevel.CRITICAL]


def test_safety_guard_blocks_auto_execution_above_financial_threshold():
    assert SafetyGuard.can_auto_execute("StandardInspectionRequest", requested_amount_lkr=50000.0) is False
    impact = SafetyGuard.evaluate_action_impact("StandardInspectionRequest", requested_amount_lkr=50000.0)
    assert impact == ImpactLevel.HIGH


def test_safety_guard_allows_low_impact_informational_queries():
    assert SafetyGuard.can_auto_execute("QueryAssetHistory", requested_amount_lkr=0.0) is True
    impact = SafetyGuard.evaluate_action_impact("QueryAssetHistory", requested_amount_lkr=0.0)
    assert impact == ImpactLevel.LOW
