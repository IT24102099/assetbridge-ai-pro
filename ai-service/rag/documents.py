from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class KnowledgeDomain(str, Enum):
    INCIDENT_KNOWLEDGE = "INCIDENT_KNOWLEDGE"
    PROVIDER_KNOWLEDGE = "PROVIDER_KNOWLEDGE"
    MAINTENANCE_KNOWLEDGE = "MAINTENANCE_KNOWLEDGE"
    GOVERNANCE_CONTINUITY_KNOWLEDGE = "GOVERNANCE_CONTINUITY_KNOWLEDGE"


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    title: str
    domain: KnowledgeDomain
    content: str
    page_number: int = 1
    source_type: str = "pdf"
    file_path: Optional[str] = None
    embedding: Optional[List[float]] = None
    relevance_score: float = 0.0
    metadata: Dict[str, str] = Field(default_factory=dict)


class KnowledgeDocument(BaseModel):
    document_id: str
    title: str
    domain: KnowledgeDomain
    document_type: str = "Guide"  # "Guide", "Checklist", "Standard", "Policy"
    file_path: str
    file_size_bytes: int = 0
    chunks_count: int = 0
    tags: List[str] = Field(default_factory=list)
    created_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RagRetrievalResult(BaseModel):
    query: str
    domain: KnowledgeDomain
    total_retrieved: int
    chunks: List[DocumentChunk]
