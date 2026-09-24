from abc import ABC, abstractmethod
from typing import List, Optional
from .documents import DocumentChunk, KnowledgeDocument


class KnowledgeRetriever(ABC):
    """
    Abstract interface for retrieving contextual knowledge chunks.
    Allows seamlessly replacing the foundation in-memory retriever with
    a vector database (e.g. pgvector, Qdrant, Chroma) in future phases
    without changing agent signatures.
    """
    
    @abstractmethod
    async def add_document(self, doc: KnowledgeDocument) -> None:
        """Indexes a document into the knowledge store."""
        pass

    @abstractmethod
    async def retrieve(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: int = 3
    ) -> List[DocumentChunk]:
        """
        Retrieves top_k most relevant knowledge chunks matching the query.
        """
        pass
