import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Path as FPath
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from agents.registry import global_agent_registry
from llm import global_llm_client
from models.agent import AgentMetadata, AgentRunRequest
from models.execution import ExecutionSummary
from models.plan import WorkflowPlan
from models.validation import ValidationResult
from orchestration.runner import AgentRunner
from orchestration.workflow_orchestrator import MultiAgentWorkflowResult, global_orchestrator
from rag import KnowledgeDocument, KnowledgeDomain, global_rag_engine
from validators.proposal_validator import ProposalValidator

router = APIRouter(prefix="/api/v1", tags=["Internal AI Service"])
runner = AgentRunner()


# --- Chat Request & Response Models ---

class ChatMessage(BaseModel):
    role: str  # "user" | "ai" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question")
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)
    asset_id: Optional[str] = None
    incident_id: Optional[str] = None
    domain_hint: Optional[KnowledgeDomain] = None


class SourceCitation(BaseModel):
    title: str
    document_id: str
    domain: str
    section: Optional[str] = None
    relevance_score: float = 0.0
    source_type: str = "pdf"
    download_url: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    domain_used: str
    sources: List[SourceCitation] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    provider_used: str = "internal"
    model_used: str = "assetbridge-rag-v1"


class OrchestrationRequest(BaseModel):
    workflow_instance_id: str
    asset_id: str
    incident_id: str
    caller_user_id: Optional[str] = "usr-mgr-001"


# --- Health & Discovery ---

@router.get("/health", summary="Health and readiness probe")
async def health_check() -> Dict[str, Any]:
    docs = global_rag_engine.get_all_documents()
    return {
        "status": "Healthy",
        "service": "AssetBridge-AI-Service",
        "registered_agents_count": len(global_agent_registry.list_agents()),
        "rag_collections_count": 4,
        "indexed_documents_count": len(docs),
        "architecture": "4-Agent + 4-RAG Vector Platform"
    }


@router.get("/agents", response_model=List[AgentMetadata], summary="List all registered specialized agents")
async def list_agents() -> List[AgentMetadata]:
    return global_agent_registry.list_agents()


# --- Chat Assistant with Question-Aware RAG ---

@router.post("/chat", response_model=ChatResponse, summary="Question-aware RAG Chat Assistant")
async def chat_assistant(request: ChatRequest) -> ChatResponse:
    q = request.message.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if len(q) > 2000:
        raise HTTPException(status_code=400, detail="Question exceeds maximum allowed length of 2000 characters.")

    # 1. Domain Intent Routing
    q_lower = q.lower()
    if request.domain_hint:
        target_domain = request.domain_hint
    elif any(k in q_lower for k in ["provider", "contractor", "plumber", "electrician", "technician", "rate", "nvq", "cida"]):
        target_domain = KnowledgeDomain.PROVIDER_KNOWLEDGE
    elif any(k in q_lower for k in ["quote", "cost", "price", "budget", "quotation", "material", "inspection", "repair cost"]):
        target_domain = KnowledgeDomain.MAINTENANCE_KNOWLEDGE
    elif any(k in q_lower for k in ["approval", "manager", "policy", "continuity", "after", "follow", "history", "audit", "governance"]):
        target_domain = KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE
    else:
        target_domain = KnowledgeDomain.INCIDENT_KNOWLEDGE

    # 2. Dense Vector Semantic RAG Retrieval against target domain
    rag_res = global_rag_engine.retrieve(query=q, domain=target_domain, top_k=3)

    # If top domain returned low match, search across incident knowledge as backup
    if not rag_res.chunks and target_domain != KnowledgeDomain.INCIDENT_KNOWLEDGE:
        rag_res = global_rag_engine.retrieve(query=q, domain=KnowledgeDomain.INCIDENT_KNOWLEDGE, top_k=2)

    # 3. Formulate Citations
    sources: List[SourceCitation] = []
    seen_docs = set()
    for chunk in rag_res.chunks:
        if chunk.document_id not in seen_docs:
            seen_docs.add(chunk.document_id)
            sources.append(SourceCitation(
                title=chunk.title,
                document_id=chunk.document_id,
                domain=chunk.domain.value,
                section=chunk.metadata.get("section_title"),
                relevance_score=chunk.relevance_score,
                source_type="pdf",
                download_url=f"/api/v1/documents/{chunk.document_id}/download"
            ))

    # 4. Invoke LLM with System Instruction, Retrieved Context, and History
    system_inst = (
        "You are the AssetBridge AI maintenance assistant. "
        "Answer the user's current question directly using the supplied knowledge context. "
        "Use retrieved knowledge when relevant. "
        "Do not invent maintenance facts that are not supported by the available context. "
        "If the knowledge base does not contain enough information, clearly say that the information is not available and recommend an appropriate next step. "
        "Keep answers concise, practical, and relevant to the user's question. "
        "For safety-critical maintenance situations, provide appropriate safety guidance and recommend professional inspection when necessary. "
        "Do not answer a different question from the one the user asked."
    )

    conv_history = [{"role": m.role, "content": m.content} for m in request.history]
    llm_resp = await global_llm_client.generate_response(
        system_instruction=system_inst,
        user_prompt=q,
        retrieved_chunks=rag_res.chunks,
        conversation_history=conv_history
    )

    suggested = []
    if "water" in q_lower or "leak" in q_lower:
        suggested = ["Should I turn off the main water supply?", "Who can inspect my property?", "How much could this repair cost?"]
    elif "provider" in q_lower or "contractor" in q_lower:
        suggested = ["Check provider availability", "Compare quotations", "What is the warranty period?"]
    else:
        suggested = ["What should I do first if there is a water leak?", "What are common causes of pipe leakage?", "What documents are available?"]

    return ChatResponse(
        answer=llm_resp.content,
        domain_used=target_domain.value,
        sources=sources,
        suggested_actions=suggested,
        provider_used=llm_resp.provider,
        model_used=llm_resp.model
    )


# --- Document Registry & PDF Downloads ---

@router.get("/documents", response_model=List[KnowledgeDocument], summary="Get all indexed PDF knowledge documents")
async def get_documents() -> List[KnowledgeDocument]:
    return global_rag_engine.get_all_documents()


@router.get("/documents/{document_id}/download", summary="Download binary PDF knowledge document")
async def download_document(document_id: str = FPath(..., description="Document identifier")):
    doc = global_rag_engine.get_document_by_id(document_id)
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail=f"Knowledge document '{document_id}' was not found.")

    return FileResponse(
        path=doc.file_path,
        media_type="application/pdf",
        filename=f"{doc.title.replace(' ', '_')}.pdf"
    )


# --- Multi-Agent Orchestration & Validation ---

@router.post("/orchestrate", response_model=MultiAgentWorkflowResult, summary="Execute full 4-agent sequential workflow")
async def orchestrate_workflow(request: OrchestrationRequest) -> MultiAgentWorkflowResult:
    return await global_orchestrator.orchestrate_full_workflow(
        workflow_instance_id=request.workflow_instance_id,
        asset_id=request.asset_id,
        incident_id=request.incident_id,
        caller_user_id=request.caller_user_id
    )


@router.post("/agents/{agent_name}/run", response_model=ExecutionSummary, summary="Execute a specific agent turn")
async def run_agent(
    agent_name: str = FPath(..., description="Name of the agent to invoke"),
    request: AgentRunRequest = ...
) -> ExecutionSummary:
    agent = global_agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent_name}' is not registered in the AI service."
        )

    return await runner.run_with_retry(agent, request)


@router.post("/validate-plan", response_model=ValidationResult, summary="Deterministically validate a workflow plan")
async def validate_plan(plan: WorkflowPlan) -> ValidationResult:
    return ProposalValidator.validate_workflow_plan(plan)
