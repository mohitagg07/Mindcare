"""
RAG service — lightweight version for Render free tier.
No chromadb, no sentence-transformers, no torch.
Loads PDFs with pypdf, does simple keyword search, sends context to Groq.
"""
import os
import logging

logger        = logging.getLogger("mindcare.rag")
_pdf_chunks   = []
RAG_AVAILABLE = False


def initialize_rag():
    global _pdf_chunks, RAG_AVAILABLE

    docs_path = os.path.join(os.path.dirname(__file__), "../documents")

    if not os.path.exists(docs_path):
        logger.warning("⚠️ documents/ folder not found — RAG disabled")
        return

    pdf_files = [f for f in os.listdir(docs_path) if f.endswith(".pdf")]
    if not pdf_files:
        logger.warning("⚠️ No PDFs in documents/ — RAG disabled")
        return

    try:
        from pypdf import PdfReader

        all_chunks = []
        for pdf_file in pdf_files:
            path = os.path.join(docs_path, pdf_file)
            try:
                reader = PdfReader(path)
                text   = " ".join(
                    page.extract_text() or "" for page in reader.pages
                )
                # Split into ~500 char chunks
                words  = text.split()
                chunk  = []
                for word in words:
                    chunk.append(word)
                    if len(" ".join(chunk)) >= 500:
                        all_chunks.append(" ".join(chunk))
                        chunk = []
                if chunk:
                    all_chunks.append(" ".join(chunk))
                logger.info(f"  Loaded: {pdf_file} ({len(reader.pages)} pages)")
            except Exception as e:
                logger.warning(f"  Could not load {pdf_file}: {e}")

        if not all_chunks:
            logger.warning("⚠️ No text extracted — RAG disabled")
            return

        _pdf_chunks   = all_chunks
        RAG_AVAILABLE = True
        logger.info(f"✅ RAG ready — {len(_pdf_chunks)} chunks from {len(pdf_files)} PDFs")

    except Exception as e:
        logger.warning(f"⚠️ RAG disabled: {e}")
        RAG_AVAILABLE = False


def query_rag(question: str) -> Optional[str]:
    if not RAG_AVAILABLE or not _pdf_chunks:
        return None
    try:
        # Simple keyword search — find top 3 most relevant chunks
        q_words = set(question.lower().split())
        scored  = []
        for chunk in _pdf_chunks:
            c_words = set(chunk.lower().split())
            score   = len(q_words & c_words)
            if score > 0:
                scored.append((score, chunk))

        scored.sort(reverse=True)
        top = [c for _, c in scored[:3]]

        if not top:
            return None

        return " ... ".join(top)[:1500]

    except Exception as e:
        logger.error(f"RAG query error: {e}")
        return None


def is_rag_available() -> bool:
    return RAG_AVAILABLE