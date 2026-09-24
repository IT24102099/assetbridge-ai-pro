import os
import sys
import pytest

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.agent import AgentRunRequest


@pytest.fixture
def sample_incident_request() -> AgentRunRequest:
    return AgentRunRequest(
        workflow_instance_id="wf-test-11112222",
        incident_id="inc-test-33334444",
        asset_id="asset-test-55556666",
        correlation_id="corr-test-77778888",
        requested_by_user_id="user-manager-01",
        user_role="Manager",
        context_data={
            "category": "RoofingAndWaterproofing",
            "city": "Colombo",
            "estimated_budget_lkr": 65000.0
        }
    )
