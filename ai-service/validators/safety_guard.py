from typing import List
from models.approval import ImpactLevel


class SafetyGuard:
    """
    Enforces the strict Human-in-the-Loop boundary.
    Guarantees that no autonomous AI agent can bypass the approval gate
    for high-impact financial or structural actions.
    """
    
    HIGH_IMPACT_ACTIONS: List[str] = [
        "ApproveQuotationAndAuthorizeExecution",
        "AuthorizeContractorPayout",
        "RejectMaintenanceBid",
        "OverrideBudgetLimit",
        "SignOffJobCompletion",
        "CancelActiveWorkflow"
    ]
    
    FINANCIAL_THRESHOLD_LKR: float = 25000.0

    @classmethod
    def evaluate_action_impact(
        cls,
        action_type: str,
        requested_amount_lkr: float = 0.0
    ) -> ImpactLevel:
        if action_type in cls.HIGH_IMPACT_ACTIONS:
            return ImpactLevel.HIGH if requested_amount_lkr < 100000.0 else ImpactLevel.CRITICAL
            
        if requested_amount_lkr > cls.FINANCIAL_THRESHOLD_LKR:
            return ImpactLevel.HIGH
            
        if requested_amount_lkr > 0:
            return ImpactLevel.MEDIUM
            
        return ImpactLevel.LOW

    @classmethod
    def can_auto_execute(cls, action_type: str, requested_amount_lkr: float = 0.0) -> bool:
        impact = cls.evaluate_action_impact(action_type, requested_amount_lkr)
        return impact == ImpactLevel.LOW
