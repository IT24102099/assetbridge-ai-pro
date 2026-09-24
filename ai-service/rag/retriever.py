import os
from pathlib import Path
from typing import Dict, List, Optional
from .documents import DocumentChunk, KnowledgeDocument, KnowledgeDomain, RagRetrievalResult
from .embeddings import DenseVectorEmbedder
from .pdf_loader import PdfDocumentLoader


class SharedRagEngine:
    """
    Shared RAG Engine maintaining 4 domain-specific vector knowledge collections:
    1. INCIDENT_KNOWLEDGE (Agent 1)
    2. PROVIDER_KNOWLEDGE (Agent 2)
    3. MAINTENANCE_KNOWLEDGE (Agent 3)
    4. GOVERNANCE_CONTINUITY_KNOWLEDGE (Agent 4)
    """

    def __init__(self, base_docs_dir: Optional[str] = None):
        if base_docs_dir is None:
            # Default to relative knowledge_docs directory
            self.base_dir = Path(__file__).parent.parent / "knowledge_docs"
        else:
            self.base_dir = Path(base_docs_dir)

        self.embedder = DenseVectorEmbedder(dimension=256)
        
        # 4 Domain collections
        self._collections: Dict[KnowledgeDomain, List[DocumentChunk]] = {
            KnowledgeDomain.INCIDENT_KNOWLEDGE: [],
            KnowledgeDomain.PROVIDER_KNOWLEDGE: [],
            KnowledgeDomain.MAINTENANCE_KNOWLEDGE: [],
            KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE: [],
        }
        
        self._documents: Dict[str, KnowledgeDocument] = {}
        self._is_indexed = False

    def initialize_and_index(self) -> None:
        """
        Loads all physical PDF documents from the 4 domain directories,
        generates semantic chunks, computes dense embeddings, and indexes them.
        """
        domain_folder_map = {
            "INCIDENT": KnowledgeDomain.INCIDENT_KNOWLEDGE,
            "PROVIDER": KnowledgeDomain.PROVIDER_KNOWLEDGE,
            "MAINTENANCE": KnowledgeDomain.MAINTENANCE_KNOWLEDGE,
            "GOVERNANCE": KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE,
        }

        # Clear existing
        for d in self._collections:
            self._collections[d] = []
        self._documents.clear()

        for folder_name, domain in domain_folder_map.items():
            folder_path = self.base_dir / folder_name
            if not folder_path.exists():
                continue

            for pdf_file in folder_path.glob("*.pdf"):
                try:
                    doc, chunks = PdfDocumentLoader.load_pdf_document(pdf_file, domain)
                    for chunk in chunks:
                        chunk.embedding = self.embedder.embed_text(f"{chunk.title} {chunk.content}")
                        self._collections[domain].append(chunk)
                    
                    self._documents[doc.document_id] = doc
                except Exception as ex:
                    print(f"Failed to index PDF {pdf_file}: {ex}")

        self._is_indexed = True
        total_chunks = sum(len(c) for c in self._collections.values())
        print(f"RAG Engine indexed {len(self._documents)} PDF documents with {total_chunks} total chunks across 4 collections.")

    def retrieve(
        self,
        query: str,
        domain: KnowledgeDomain,
        top_k: int = 3,
        min_score: float = 0.05
    ) -> RagRetrievalResult:
        """
        Performs dense vector cosine similarity search against a specific domain collection.
        """
        if not self._is_indexed:
            self.initialize_and_index()

        collection = self._collections.get(domain, [])
        if not collection:
            return RagRetrievalResult(query=query, domain=domain, total_retrieved=0, chunks=[])

        query_vector = self.embedder.embed_text(query)
        scored_chunks: List[DocumentChunk] = []

        for chunk in collection:
            if not chunk.embedding:
                chunk.embedding = self.embedder.embed_text(f"{chunk.title} {chunk.content}")
            
            score = self.embedder.cosine_similarity(query_vector, chunk.embedding)
            
            # Additional term boost if exact keywords match
            query_words = set(query.lower().split())
            content_words = set(chunk.content.lower().split())
            overlap = len(query_words.intersection(content_words))
            boosted_score = score + (0.05 * overlap)

            if boosted_score >= min_score:
                scored = chunk.model_copy()
                scored.relevance_score = round(boosted_score, 4)
                scored_chunks.append(scored)

        scored_chunks.sort(key=lambda c: c.relevance_score, reverse=True)
        top_chunks = scored_chunks[:top_k]

        return RagRetrievalResult(
            query=query,
            domain=domain,
            total_retrieved=len(top_chunks),
            chunks=top_chunks
        )

    def get_all_documents(self) -> List[KnowledgeDocument]:
        if not self._is_indexed:
            self.initialize_and_index()
        return list(self._documents.values())

    def get_document_by_id(self, document_id: str) -> Optional[KnowledgeDocument]:
        if not self._is_indexed:
            self.initialize_and_index()
        return self._documents.get(document_id.lower())


# Global singleton instance
global_rag_engine = SharedRagEngine()
