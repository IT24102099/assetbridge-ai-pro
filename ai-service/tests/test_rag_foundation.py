import pytest
from rag import KnowledgeDomain, global_rag_engine


@pytest.mark.asyncio
async def test_shared_rag_retrieval_matches_relevant_chunks():
    """Verify SharedRagEngine retrieves relevant chunks for a domain query."""
    res = global_rag_engine.retrieve(
        query="water leak shut off stopcock valve",
        domain=KnowledgeDomain.INCIDENT_KNOWLEDGE,
        top_k=2
    )
    assert res.total_retrieved > 0
    assert len(res.chunks) > 0
    assert "Water Leakage Guide" in [c.title for c in res.chunks]
    assert res.chunks[0].relevance_score > 0.0


@pytest.mark.asyncio
async def test_shared_rag_domain_isolation():
    """Verify collections are isolated by domain."""
    # Searching for contractor verification in PROVIDER_KNOWLEDGE returns Provider guides
    res_provider = global_rag_engine.retrieve(
        query="NVQ Level 4 CIDA contractor verification",
        domain=KnowledgeDomain.PROVIDER_KNOWLEDGE,
        top_k=2
    )
    assert res_provider.total_retrieved > 0
    assert any("Provider" in c.title for c in res_provider.chunks)

    # Searching in GOVERNANCE returns governance policies
    res_gov = global_rag_engine.retrieve(
        query="human manager approval safety policy",
        domain=KnowledgeDomain.GOVERNANCE_CONTINUITY_KNOWLEDGE,
        top_k=2
    )
    assert res_gov.total_retrieved > 0
    assert any("Approval" in c.title or "Continuity" in c.title for c in res_gov.chunks)
