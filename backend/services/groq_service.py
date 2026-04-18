"""Groq service — fast llama-3.1-8b-instant, short responses."""
import os, logging
from groq import Groq
from typing import Dict, List, Optional

logger  = logging.getLogger("mindcare.groq")
client: Optional[Groq]          = None
sessions: Dict[str, List[Dict]] = {}

SYSTEM_TEMPLATE = """You are MindCare, a compassionate mental health AI.

CRITICAL RULES:
- 2-3 short paragraphs MAX. Never write walls of text.
- Warm, plain human language. Not clinical.
- End with ONE simple question.
- Max 2 suggestions at a time.
- Listen first, then offer ONE idea.

THERAPY MODE:
- PHQ-9 > 15 → extra warmth, mention crisis line
- Trajectory deteriorating → prioritize grounding exercise
- Trajectory improving → acknowledge progress

CRISIS (suicidal ideation only): iCall India: 9152987821 | AASRA: 9820466627

CONTEXT: Risk={risk_level} | PHQ-9={phq9_score}/27 ({phq9_category}) | GAD-7={gad7_score}/21 ({gad7_category}) | Emotion={emotion} | Trend={trend}"""


def get_client() -> Groq:
    global client
    if client is None:
        key = os.getenv("GROQ_API_KEY","")
        if not key: raise ValueError("GROQ_API_KEY not set")
        client = Groq(api_key=key)
    return client


def build_system(ctx: dict) -> str:
    traj = ctx.get("trajectory") or {}
    return SYSTEM_TEMPLATE.format(
        risk_level    = ctx.get("risk_level","UNKNOWN"),
        phq9_score    = ctx.get("phq9_score","N/A"),
        phq9_category = ctx.get("phq9_category","Not assessed"),
        gad7_score    = ctx.get("gad7_score","N/A"),
        gad7_category = ctx.get("gad7_category","Not assessed"),
        emotion       = ctx.get("emotion","Unknown"),
        trend         = traj.get("trend","unknown"),
    )


def chat(session_id: str, message: str, context: dict=None, rag_context: str=None) -> str:
    gc  = get_client()
    ctx = context or {}
    sys_msg = build_system(ctx)

    if session_id not in sessions:
        sessions[session_id] = [{"role":"system","content":sys_msg}]
    else:
        sessions[session_id][0] = {"role":"system","content":sys_msg}

    user_msg = message
    if rag_context:
        user_msg = f"[Context: {rag_context[:400]}]\n\nUser: {message}"

    sessions[session_id].append({"role":"user","content":user_msg})

    resp = gc.chat.completions.create(
        model="llama-3.1-8b-instant",  # Fastest — 1-2s response time
        messages=sessions[session_id],
        temperature=0.7,
        max_tokens=280,  # Short and focused
    )
    reply = resp.choices[0].message.content
    sessions[session_id].append({"role":"assistant","content":reply})

    if len(sessions[session_id]) > 41:
        sessions[session_id] = [sessions[session_id][0]] + sessions[session_id][-40:]

    logger.info(f"Chat [{session_id[:8]}]: {len(reply)} chars")
    return reply


def get_history(sid: str) -> list:
    return [m for m in sessions.get(sid,[]) if m["role"]!="system"]

def clear_session(sid: str):
    sessions.pop(sid, None)
