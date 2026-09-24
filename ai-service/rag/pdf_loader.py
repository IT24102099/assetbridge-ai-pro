import re
from pathlib import Path
from typing import List, Tuple
from .documents import DocumentChunk, KnowledgeDocument, KnowledgeDomain


class PdfDocumentLoader:
    """
    Parses and extracts structured text chunks from AssetBridge PDF knowledge documents.
    Extracts text streams and sections directly from PDF 1.4 objects.
    """

    @staticmethod
    def extract_text_from_pdf(file_path: Path) -> str:
        with open(file_path, "rb") as f:
            content = f.read().decode("latin-1", errors="ignore")
        
        # Extract text within stream blocks (between BT and ET operators)
        stream_matches = re.findall(r"stream\s*\n(.*?)endstream", content, re.DOTALL)
        extracted_text_blocks = []
        
        for stream in stream_matches:
            # Match text strings inside parentheses before Tj operator: (Text) Tj
            tj_matches = re.findall(r"\((.*?)\)\s*Tj", stream)
            clean_strings = []
            for m in tj_matches:
                # Unescape PDF parentheses
                t = m.replace("\\(", "(").replace("\\)", ")")
                if not t.startswith("---") and not t.startswith("Domain:"):
                    clean_strings.append(t)
            if clean_strings:
                extracted_text_blocks.append(" ".join(clean_strings))
                
        return "\n\n".join(extracted_text_blocks)

    @classmethod
    def load_pdf_document(cls, file_path: Path, domain: KnowledgeDomain) -> Tuple[KnowledgeDocument, List[DocumentChunk]]:
        if not file_path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        raw_text = cls.extract_text_from_pdf(file_path)
        doc_id = file_path.stem.lower().replace("_", "-")
        title = file_path.stem.replace("_", " ")
        file_size = file_path.stat().st_size
        
        # Split into logical sections by numbered headings or paragraph breaks
        sections = re.split(r"(?=\d+\.\s+[A-Z])", raw_text)
        chunks: List[DocumentChunk] = []
        
        for idx, sec in enumerate(sections):
            text = sec.strip()
            if not text:
                continue
            
            # Extract section heading if present
            heading_match = re.match(r"^(\d+\.\s+[^.]+)\.\s*(.*)$", text, re.DOTALL)
            if heading_match:
                section_title = heading_match.group(1).strip()
                section_body = text
            else:
                section_title = f"{title} - Section {idx+1}"
                section_body = text

            chunk = DocumentChunk(
                chunk_id=f"{doc_id}-chunk-{idx+1}",
                document_id=doc_id,
                title=title,
                domain=domain,
                content=section_body,
                page_number=1,
                source_type="pdf",
                file_path=str(file_path),
                metadata={
                    "section_title": section_title,
                    "filename": file_path.name,
                    "domain": domain.value
                }
            )
            chunks.append(chunk)

        doc = KnowledgeDocument(
            document_id=doc_id,
            title=title,
            domain=domain,
            document_type="Checklist" if "checklist" in doc_id else "Policy" if "policy" in doc_id else "Guide",
            file_path=str(file_path),
            file_size_bytes=file_size,
            chunks_count=len(chunks),
            tags=[domain.value, doc_id]
        )

        return doc, chunks
