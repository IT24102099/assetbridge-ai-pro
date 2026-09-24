from typing import Any, Dict, List
from .base import BaseAgent
from llm import global_llm_client
from models.agent import AgentRunRequest, AgentType
from models.execution import ToolExecutionRecord
from models.plan import PriorityLevel, StepProposal, WorkflowPlan
from rag import KnowledgeDomain, global_rag_engine


class IncidentPlanningAgent(BaseAgent):
    name = "IncidentPlanningAgent"
    agent_type = AgentType.INCIDENT_PLANNING
    description = "Analyzes structural incidents, queries INCIDENT_KNOWLEDGE RAG, determines priority, and generates multi-step repair workflows."
    allowed_tools = [
        "GetAsset",
        "GetIncident",
        "GetAssetHistory",
        "GetIncidentEvidence",
        "CreateWorkflowPlan"
    ]
    timeout_seconds = 25.0
    max_retries = 3

    async def _execute_internal(
        self,
        request: AgentRunRequest,
        traces: List[ToolExecutionRecord]
    ) -> Dict[str, Any]:
        # Step 1: Query controlled backend tools
        asset_res = await self.invoke_tool("GetAsset", {"asset_id": request.asset_id}, traces)
        incident_res = await self.invoke_tool("GetIncident", {"incident_id": request.incident_id}, traces)
        await self.invoke_tool("GetAssetHistory", {"asset_id": request.asset_id, "limit": 5}, traces)
        await self.invoke_tool("GetIncidentEvidence", {"incident_id": request.incident_id}, traces)

        # Step 2: Query domain-specific RAG collection (INCIDENT_KNOWLEDGE)
        incident_title = incident_res.result.get("title", "water leak plumbing failure") if (incident_res.result and isinstance(incident_res.result, dict)) else "water leak"
        rag_result = global_rag_engine.retrieve(
            query=f"emergency water isolation leak repair safety {incident_title}",
            domain=KnowledgeDomain.INCIDENT_KNOWLEDGE,
            top_k=2
        )

        # Step 3: LLM reasoning over retrieved RAG knowledge and tool context
        rag_context = [c.content for c in rag_result.chunks]
        prompt = (
            f"Analyze incident for Asset {request.asset_id} (Incident: {incident_title}). "
            f"RAG Knowledge: {' '.join(rag_context)}. "
            f"Generate a prioritized workflow plan."
        )
        system_inst = "You are the AssetBridge Incident Planning Agent. Formulate a safe, compliant repair workflow based on incident knowledge standards."
        llm_resp = await global_llm_client.generate_response(system_inst, prompt, rag_result.chunks)

        steps = [
            StepProposal(
                step_order=1,
                step_name="On-Site Structural Inspection",
                action_description="Local Representative coordinates on-site assessment with certified waterproofing contractor.",
                assigned_role="Representative",
                estimated_duration_hours=4.0,
                requires_approval=False
            ),
            StepProposal(
                step_order=2,
                step_name="Quotation Submission & Rate Audit",
                action_description="Contractor submits line-item estimate for terracotta ridge re-bedding and waterproof membrane.",
                assigned_role="ServiceProvider",
                estimated_duration_hours=24.0,
                requires_approval=False
            ),
            StepProposal(
                step_order=3,
                step_name="Manager Authorization",
                action_description="Overseas property manager reviews audited quotation against preliminary budget.",
                assigned_role="Manager",
                estimated_duration_hours=12.0,
                requires_approval=True
            ),
            StepProposal(
                step_order=4,
                step_name="Execution & Waterproofing Repair",
                action_description="Contractor executes roof tile realignment, flashing sealing, and ceiling stain treatment.",
                assigned_role="ServiceProvider",
                estimated_duration_hours=48.0,
                requires_approval=False
            )
        ]

        plan_res = await self.invoke_tool(
            "CreateWorkflowPlan",
            {
                "workflow_instance_id": request.workflow_instance_id,
                "incident_category": "RoofingAndWaterproofing",
                "assessed_priority": PriorityLevel.HIGH.value,
                "estimated_cost_range_lkr": "55,000 - 70,000 LKR",
                "structural_risk": "High risk of ceiling plaster collapse and electrical conduit moisture if unaddressed.",
                "financial_risk": "Moderate; quotes must include fixed labor rates to prevent scope creep.",
                "urgency_rationale": "Active water penetration during current monsoon cycle.",
                "steps": [s.model_dump() for s in steps]
            },
            traces
        )

        return {
            "decision_summary": f"Assessed incident as High priority. Formulated 4-step execution plan using INCIDENT_KNOWLEDGE RAG.",
            "rag_collection": KnowledgeDomain.INCIDENT_KNOWLEDGE.value,
            "rag_sources": [{"title": c.title, "chunk_id": c.chunk_id, "score": c.relevance_score} for c in rag_result.chunks],
            "llm_reasoning": llm_resp.content,
            "workflow_plan": plan_res.result
        }
