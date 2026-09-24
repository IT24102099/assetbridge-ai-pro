import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Healthy"
        assert data["registered_agents_count"] == 4


@pytest.mark.asyncio
async def test_list_agents_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/agents")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        names = [a["name"] for a in data]
        assert "IncidentPlanningAgent" in names


@pytest.mark.asyncio
async def test_run_agent_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "workflow_instance_id": "wf-api-test-01",
            "incident_id": "inc-api-test-01",
            "asset_id": "asset-api-test-01",
            "correlation_id": "corr-api-01",
            "requested_by_user_id": "user-mgr",
            "user_role": "Manager",
            "context_data": {"category": "Roofing", "city": "Colombo"}
        }
        response = await client.post("/api/v1/agents/IncidentPlanningAgent/run", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Success"
        assert data["agent_name"] == "IncidentPlanningAgent"
        assert "workflow_plan" in data["structured_payload"]


@pytest.mark.asyncio
async def test_run_unregistered_agent_returns_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "workflow_instance_id": "wf-01",
            "incident_id": "inc-01",
            "asset_id": "asset-01"
        }
        response = await client.post("/api/v1/agents/NonExistentAgent/run", json=payload)
        assert response.status_code == 404
        assert "not registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_validate_plan_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        plan_payload = {
            "plan_id": "plan-api-01",
            "workflow_instance_id": "wf-01",
            "incident_category": "Plumbing",
            "assessed_priority": "Low",
            "estimated_cost_range_lkr": "15,000 - 25,000",
            "risk_assessment": {
                "structural_risk": "Low",
                "financial_risk": "Low",
                "urgency_rationale": "Minor washer replacement"
            },
            "steps": [
                {
                    "step_order": 1,
                    "step_name": "Replace washer",
                    "action_description": "Plumber replaces tap washer",
                    "assigned_role": "ServiceProvider",
                    "estimated_duration_hours": 1.0,
                    "requires_approval": False
                }
            ]
        }
        response = await client.post("/api/v1/validate-plan", json=plan_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Passed"
        assert data["is_safe_for_human_review"] is True
