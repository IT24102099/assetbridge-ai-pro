import re
from typing import List, Optional
from .base import KnowledgeRetriever
from .documents import DocumentChunk, KnowledgeDocument


class SimpleKnowledgeRetriever(KnowledgeRetriever):
    """
    Foundation in-memory knowledge retriever for property maintenance standards.
    Uses token-overlap and keyword scoring, perfectly suited for deterministic testing
    and zero-dependency bootstrapping.
    """
    def __init__(self):
        self._documents: List[KnowledgeDocument] = []
        self._chunks: List[DocumentChunk] = []

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r'\b\w+\b', text.lower())
        return set(w for w in words if len(w) > 2)

    async def add_document(self, doc: KnowledgeDocument) -> None:
        self._documents.append(doc)
        
        # Simple paragraph chunker
        paragraphs = [p.strip() for p in doc.content.split("\n\n") if p.strip()]
        for idx, p in enumerate(paragraphs):
            chunk = DocumentChunk(
                chunk_id=f"{doc.document_id}-p{idx+1}",
                document_id=doc.document_id,
                content=p,
                metadata={"category": doc.category, "title": doc.title}
            )
            self._chunks.append(chunk)

    async def retrieve(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: int = 3
    ) -> List[DocumentChunk]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        scored_chunks: List[DocumentChunk] = []

        for chunk in self._chunks:
            if category and chunk.metadata.get("category") != category:
                continue

            chunk_tokens = self._tokenize(chunk.content)
            overlap = query_tokens.intersection(chunk_tokens)
            if overlap:
                score = len(overlap) / (len(query_tokens) + 0.1)
                scored = DocumentChunk(
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    content=chunk.content,
                    metadata=chunk.metadata,
                    relevance_score=round(score, 3)
                )
                scored_chunks.append(scored)

        # Sort by relevance descending
        scored_chunks.sort(key=lambda c: c.relevance_score, reverse=True)
        return scored_chunks[:top_k]


# Global default RAG retriever preloaded with standard Sri Lankan maintenance guides
global_retriever = SimpleKnowledgeRetriever()
