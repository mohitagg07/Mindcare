"""
RAG service — PyPDFLoader + local embeddings, Keras-conflict-free.
"""

import os
import logging

# ── Block transformers from importing TensorFlow/Keras before anything else ──
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

logger        = logging.getLogger("mindcare.rag")
rag_chain     = None
RAG_AVAILABLE = False


def initialize_rag():
    global rag_chain, RAG_AVAILABLE

    docs_path = os.path.join(os.path.dirname(__file__), "../documents")
    db_path   = os.path.join(os.path.dirname(__file__), "../chroma_db")

    if not os.path.exists(docs_path):
        logger.warning("⚠️ documents/ folder not found — RAG disabled")
        return

    pdf_files = [f for f in os.listdir(docs_path) if f.endswith(".pdf")]
    if not pdf_files:
        logger.warning("⚠️ No PDFs in documents/ — RAG disabled")
        return

    try:
        # Must set before sentence_transformers import
        os.environ["TRANSFORMERS_NO_TF"] = "1"
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

        from langchain_community.document_loaders import PyPDFLoader
        from langchain.text_splitter              import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores     import Chroma
        from langchain_core.embeddings            import Embeddings
        from langchain.chains                     import RetrievalQA
        from langchain_groq                       import ChatGroq

        # Import sentence_transformers AFTER env vars are set
        from sentence_transformers import SentenceTransformer

        class LocalEmbedding(Embeddings):
            def __init__(self):
                # paraphrase-MiniLM is pure PyTorch — zero TF/Keras dependency
                self.model = SentenceTransformer(
                    "paraphrase-MiniLM-L3-v2",
                    device="cpu",
                )

            def embed_documents(self, texts):
                return self.model.encode(
                    texts, show_progress_bar=False, convert_to_numpy=True
                ).tolist()

            def embed_query(self, text):
                return self.model.encode(
                    [text], show_progress_bar=False, convert_to_numpy=True
                )[0].tolist()

        embeddings = LocalEmbedding()

        # Load or reuse existing Chroma DB
        if os.path.exists(db_path) and os.listdir(db_path):
            vector_db = Chroma(
                persist_directory=db_path,
                embedding_function=embeddings,
            )
            logger.info("✅ Loaded existing Chroma vector DB")

        else:
            all_docs = []
            for pdf_file in pdf_files:
                pdf_path = os.path.join(docs_path, pdf_file)
                try:
                    loader = PyPDFLoader(pdf_path)
                    all_docs.extend(loader.load())
                    logger.info(f"  Loaded: {pdf_file}")
                except Exception as e:
                    logger.warning(f"  Could not load {pdf_file}: {e}")

            if not all_docs:
                logger.warning("⚠️ No documents loaded — RAG disabled")
                return

            splitter  = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            texts     = splitter.split_documents(all_docs)
            vector_db = Chroma.from_documents(
                texts, embeddings, persist_directory=db_path
            )
            logger.info(
                f"✅ Created Chroma DB — {len(pdf_files)} PDFs, {len(texts)} chunks"
            )

        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
        )

        rag_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_db.as_retriever(search_kwargs={"k": 3}),
        )

        RAG_AVAILABLE = True
        logger.info("🚀 RAG fully initialized")

    except Exception as e:
        logger.warning(f"⚠️ RAG disabled: {e}")
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