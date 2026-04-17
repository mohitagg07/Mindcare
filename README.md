<<<<<<< HEAD
# 🧠 MindCare: Empowering Mental Health

> **AI-powered multimodal mental health assistant** — LLaMA-3 × CNN × PHQ-9 × GAD-7 × JWT Auth × Analytics

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![LLaMA-3](https://img.shields.io/badge/LLaMA--3-70B-blueviolet)](https://groq.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)

---

## 📌 What Is MindCare?

MindCare is a **production-ready, full-stack AI mental health assistant** that fuses four intelligence sources into a single, empathetic response:

| Signal | Technology | Weight |
|---|---|---|
| Clinical depression screening | PHQ-9 (9-question DSM-5 tool) | 40% |
| Clinical anxiety screening | GAD-7 (7-question) | 25% |
| Facial emotion detection | CNN trained on FER2013 | 20% |
| Text sentiment analysis | TextBlob NLP | 15% |

The result: a **composite risk score (0–1)** that drives every chatbot response, exercise recommendation, and crisis escalation decision.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  Login/Register  │  Chat  │  Assessment  │  Metrics         │
└──────────┬───────────────────────────────────────┬──────────┘
           │  REST + JWT                           │
┌──────────▼───────────────────────────────────────▼──────────┐
│                   FastAPI Backend (v3)                        │
│                                                               │
│  /api/auth    /api/chat    /api/emotion    /api/metrics       │
│       │            │            │               │             │
│  JWT+bcrypt  LLaMA-3 via   CNN model     SQLAlchemy ORM      │
│  SQLAlchemy   Groq API    (emotion.h5)   MetricSnapshot       │
│       │            │            │               │             │
│  User/Session  LangChain    PIL/numpy    Latency middleware   │
│  ChatMessage    ChromaDB    TensorFlow   Per-endpoint stats   │
│       │         RAG             │               │             │
└───────┴─────────────────────────┴───────────────┴────────────┘
         │                                         │
    SQLite DB                              ChromaDB vectors
  (swap → PostgreSQL)                   (mental health PDFs)
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com) (free)
- [HuggingFace token](https://huggingface.co/settings/tokens) (free)

### 1. Clone & setup backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set GROQ_API_KEY and HUGGINGFACEHUB_API_TOKEN
```

### 2. Add the emotion model

```bash
# Copy emotion_model.h5 into:
cp /path/to/emotion_model.h5 backend/models/emotion_model.h5

# Then install TensorFlow:
pip install tensorflow-cpu==2.15.0
```

### 3. Add mental health PDFs (for RAG)

```bash
# Drop any mental health PDF documents into:
backend/documents/
# The RAG system will index them automatically on startup.
```

### 4. Run backend

```bash
cd backend
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### 5. Run frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
# Open: http://localhost:5173
```

---

## 🐳 Docker (One-Command)

```bash
# Copy and fill .env
cp backend/.env.example backend/.env

docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
```

---

## ☁️ Deploy to Production

### Backend → [Render.com](https://render.com) (Free tier)

1. Push repo to GitHub
2. New Web Service → connect repo
3. `render.yaml` is already configured
4. Add environment variables in Render dashboard:
   - `GROQ_API_KEY`
   - `HUGGINGFACEHUB_API_TOKEN`
   - `SECRET_KEY` (generate: `python -c "import secrets; print(secrets.token_hex(32))"`)

### Frontend → [Vercel](https://vercel.com) (Free)

```bash
cd frontend
# Set your backend URL:
echo "VITE_API_URL=https://your-api.onrender.com" >> .env

npx vercel --prod
```

---

## 🔑 Authentication

MindCare uses **JWT (JSON Web Token)** with bcrypt password hashing.

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create account (username, email, password) |
| `/api/auth/login` | POST | Login → returns `access_token` |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/logout` | POST | Invalidate client token |

All protected endpoints require: `Authorization: Bearer <token>`

---

## 📊 Metrics & Evaluation

The `/api/metrics` endpoints expose:

| Endpoint | Description |
|---|---|
| `/api/metrics/overview` | Total users, sessions, messages, avg latency |
| `/api/metrics/emotion-distribution` | Aggregate emotion counts |
| `/api/metrics/risk-distribution` | Session risk level breakdown |
| `/api/metrics/model-performance` | CNN accuracy, per-class F1 scores |
| `/api/metrics/latency-timeseries` | AI response latency over time |
| `/api/metrics/my-sessions` | Logged-in user's session history |

### CNN Model Performance (FER2013)

| Emotion   | Precision | Recall | F1   |
|-----------|-----------|--------|------|
| Happy     | 85%       | 83%    | **84%** |
| Sad       | 77%       | 79%    | **78%** |
| Neutral   | 78%       | 76%    | **77%** |
| Angry     | 71%       | 70%    | **70%** |
| Surprise  | 73%       | 72%    | **72%** |
| Fear      | 61%       | 59%    | **60%** |
| Disgust   | 58%       | 52%    | **55%** |

**Overall Test Accuracy: 71.3%** · Training: 73% · Validation: 70.2%

---

## 🧪 API Testing

Interactive docs at **http://localhost:8000/docs**

Quick curl tests:
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@test.com","password":"demo123"}'

# Chat (with token)
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"I feel really anxious today","phq9_score":14,"emotion":"sad"}'

# Health check
curl http://localhost:8000/api/health
```

---

## 🛡️ Privacy & Ethics

- ✅ No permanent storage of facial images — processed in-memory and discarded
- ✅ PHQ-9/GAD-7 data stored only to personalise responses, never shared
- ✅ All API keys stay server-side, never exposed to the client
- ✅ Crisis detection triggers immediate helpline display
- ✅ System never makes medical diagnoses — always recommends professional help
- ✅ Webcam access requires explicit user consent

**Crisis helplines embedded:**
- iCall (India): 9152987821
- Vandrevala Foundation: 1860-2662-345
- AASRA: 9820466627
- Crisis Text Line: Text HOME to 741741

---

## 🗂️ Project Structure

```
mindcare/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── auth/
│   │   ├── jwt.py                 # JWT + bcrypt helpers
│   │   └── dependencies.py        # get_current_user dependency
│   ├── db/
│   │   ├── database.py            # SQLAlchemy engine + session
│   │   └── models.py              # User, SessionLog, ChatMessage, MetricSnapshot
│   ├── middleware/
│   │   └── metrics.py             # Auto latency tracking
│   ├── routers/
│   │   ├── auth.py                # Register / login / me
│   │   ├── chat.py                # Chat + risk fusion
│   │   ├── assessment.py          # PHQ-9 / GAD-7
│   │   ├── emotion.py             # CNN emotion analysis
│   │   └── metrics.py             # Analytics endpoints
│   ├── services/
│   │   ├── groq_service.py        # LLaMA-3 via Groq API
│   │   ├── emotion_service.py     # TF/Keras CNN wrapper
│   │   ├── rag_service.py         # ChromaDB + LangChain RAG
│   │   ├── assessment_service.py  # PHQ-9 / GAD-7 scoring logic
│   │   └── fusion_service.py      # Multimodal risk computation
│   ├── models/                    # Drop emotion_model.h5 here
│   └── documents/                 # Drop mental health PDFs here
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Root (auth-gated)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # JWT auth state
│   │   │   └── AppContext.jsx     # Session context
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── components/
│   │   │   ├── AuthGate.jsx       # Login/register switcher
│   │   │   ├── Sidebar.jsx        # Nav + user info + logout
│   │   │   ├── Chat.jsx           # Main chat interface
│   │   │   ├── Assessment.jsx     # PHQ-9 + GAD-7 forms
│   │   │   ├── EmotionDetector.jsx# Webcam emotion detection
│   │   │   ├── Dashboard.jsx      # Risk overview
│   │   │   └── Metrics.jsx        # Analytics dashboard
│   │   └── api/client.js          # API helper (auth-aware)
│   ├── vercel.json                # Vercel deployment config
│   └── package.json
├── Dockerfile                     # Backend container
├── docker-compose.yml             # Full stack local dev
├── render.yaml                    # Render.com deployment
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **LLM** | LLaMA-3.3-70B via Groq API |
| **CNN** | TensorFlow/Keras · FER2013 dataset |
| **RAG** | LangChain · ChromaDB · sentence-transformers |
| **Backend** | FastAPI · Python 3.11 · Uvicorn |
| **Auth** | JWT (python-jose) · bcrypt (passlib) |
| **Database** | SQLAlchemy · SQLite → PostgreSQL |
| **Frontend** | React 18 · Vite · TailwindCSS |
| **Deploy** | Render (backend) · Vercel (frontend) · Docker |

---

## 👨‍💻 Author

**Mohit Aggarwal** (21BAI1277)  
B.Tech CSE — AI & ML Specialisation  
Vellore Institute of Technology, Chennai  
Guide: Dr. Sivagami M

---

*MindCare is a supplementary tool, not a replacement for professional mental health care.*
=======
🧠 MindCare: AI-Powered Mental Health Companion
MindCare is a comprehensive AI-powered mental health assistant that combines facial emotion recognition (CNN), PHQ-9 questionnaire scoring, and an LLaMA-3-based conversational chatbot to provide holistic mental well-being analysis.

🔧 Tech Stack
Frontend: Gradio for intuitive UI

Backend: Python (TensorFlow/Keras, NumPy, PIL)

LLM: LLaMA-3 via Groq API

Vector Store: ChromaDB with LangChain + HuggingFace Embeddings

Data Sources: Facial image input, PHQ-9 responses, PDFs for mental health knowledge

🚀 Features
🧠 Mental Health Chatbot: LLaMA-3 chatbot trained on curated PDFs using LangChain.

📄 PHQ-9 Assessment: Interactive 9-question depression screener with score interpretation.

😊 Emotion Detection: CNN model identifies facial emotion from 48×48 grayscale image.

📈 Biometric Inputs: Analyzes heart rate and sleep hours for mental wellness flags.

🛡️ Privacy: No user data is stored; runs entirely within temporary session.


💡 How to Run

pip install gradio keras tensorflow langchain chromadb sentence-transformers
python app.py

📁 Project Structure

📁 documents/          ← PDF mental health resources

📁 chroma_db/          ← Vector DB for chatbot

📁 face_model/         ← Trained CNN emotion model

🧠 app.py              ← Main application script


🧪 Accuracy (Mock Evaluation)

Component	Accuracy / Evaluation

CNN Emotion Model	92% (on FER+ dataset)

PHQ-9 Assessment	Clinical logic-based

LLaMA-3 Chatbot	86% helpfulness (manual)

📜 License
MIT License

>>>>>>> 78a3c85969a38be6f2a21711e31dba5caa33d4a1
