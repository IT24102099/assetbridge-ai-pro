from .documents import DocumentChunk, KnowledgeDocument, KnowledgeDomain, RagRetrievalResult
from .embeddings import DenseVectorEmbedder
from .pdf_loader import PdfDocumentLoader
from .retriever import SharedRagEngine, global_rag_engine

# Initialize and index PDF documents on module import
global_rag_engine.initialize_and_index()

__all__ = [
    "KnowledgeDomain",
    "DocumentChunk",
    "KnowledgeDocument",
    "RagRetrievalResult",
    "DenseVectorEmbedder",
    "PdfDocumentLoader",
    "SharedRagEngine",
    "global_rag_engine",
]
