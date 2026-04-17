Place mental health PDF files in this directory to enable RAG (Retrieval-Augmented Generation).

Recommended files:
  - Your MindCare project report (Mohit_final_report.pdf)
  - Mental health guidelines
  - CBT therapy guides
  - Any relevant research papers

On first startup, MindCare will:
  1. Load all PDFs from this folder
  2. Split them into chunks
  3. Create vector embeddings using sentence-transformers
  4. Store in ChromaDB for semantic search

This allows the AI to give research-backed, scientifically grounded responses.

Without PDFs, the chatbot works normally using LLaMA-3 knowledge only.
