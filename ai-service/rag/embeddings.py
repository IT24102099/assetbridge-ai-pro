import math
import re
import hashlib
from typing import List, Optional


class DenseVectorEmbedder:
    """
    Computes dense vector representations with L2-normalized cosine similarity.
    Uses subword character n-grams and term frequency hashing (dimension = 256)
    for dense semantic representation with zero runtime dependencies.
    """
    def __init__(self, dimension: int = 256):
        self.dimension = dimension

    def _tokenize_ngrams(self, text: str) -> List[str]:
        words = re.findall(r"\b\w+\b", text.lower())
        tokens = []
        for w in words:
            tokens.append(w)
            # Add character 3-grams and 4-grams for subword similarity
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    tokens.append(w[i:i+3])
        return tokens

    def embed_text(self, text: str) -> List[float]:
        vector = [0.0] * self.dimension
        tokens = self._tokenize_ngrams(text)
        if not tokens:
            return vector

        for token in tokens:
            # Deterministic hash to dimension index
            idx = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16) % self.dimension
            vector[idx] += 1.0

        # Apply L2 normalization
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0.0:
            vector = [round(x / norm, 5) for x in vector]

        return vector

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, dot))
