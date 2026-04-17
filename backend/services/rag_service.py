"""
RAG service — stable, optional, production-safe
"""

import os
import logging

logger = logging.getLogger("mindcare.rag")

rag_chain = None
RAG_AVAILABLE = False


def initialize_rag():
    global rag_chain, RAG_AVAILABLE

    docs_path = os.path.join(os.path.dirname(__file__), "../documents")
    db_path = os.path.join(os.path.dirname(__file__), "../chroma_db")

    try:
        if not os.path.exists(docs_path):
            logger.warning("⚠️ documents folder not found — RAG disabled")
            return

        pdf_files = [f for f in os.listdir(docs_path) if f.endswith(".pdf")]

        if not pdf_files:
            logger.warning("⚠️ No PDFs found — RAG disabled")
            return

        from langchain_community.document_loaders import DirectoryLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import Chroma
        from sentence_transformers import SentenceTransformer
        from langchain.embeddings.base import Embeddings
        from langchain.chains import RetrievalQA
        from langchain_groq import ChatGroq

        # 🔥 Custom embedding wrapper (avoids version conflicts)
        class LocalEmbedding(Embeddings):
            def __init__(self):
                self.model = SentenceTransformer("all-MiniLM-L6-v2")

            def embed_documents(self, texts):
                return self.model.encode(texts).tolist()

            def embed_query(self, text):
                return self.model.encode([text])[0].tolist()

        embeddings = LocalEmbedding()

        # Load or create DB
        if os.path.exists(db_path) and os.listdir(db_path):
            vector_db = Chroma(persist_directory=db_path, embedding_function=embeddings)
            logger.info("✅ Loaded existing vector DB")
        else:
            loader = DirectoryLoader(docs_path, glob="*.pdf")
            docs = loader.load()

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )
            texts = splitter.split_documents(docs)

            vector_db = Chroma.from_documents(
                texts,
                embeddings,
                persist_directory=db_path
            )

            logger.info(f"✅ Created vector DB from {len(pdf_files)} PDFs")

        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY")
        )

        rag_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_db.as_retriever(search_kwargs={"k": 3}),
        )

        RAG_AVAILABLE = True
        logger.info("🚀 RAG fully initialized")

    except Exception as e:
        logger.warning(f"⚠️ RAG disabled due to error: {e}")
        RAG_AVAILABLE = False


def query_rag(question: str):
    if not RAG_AVAILABLE or rag_chain is None:
        return None

    try:
        result = rag_chain.invoke({"query": question})
        return result.get("result", "")
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        return None


def is_rag_available():
    return RAG_AVAILABLE