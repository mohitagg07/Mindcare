"""
Groq / LLaMA-3 — production-safe, context-aware
"""

import os
import logging
from groq import Groq
from typing import Dict, List, Optional

logger = logging.getLogger("mindcare.groq")

client: Optional[Groq] = None
sessions: Dict[str, List[Dict]] = {}

SYSTEM_TEMPLATE = """You are MindCare, a compassionate mental health assistant.

RULES:
- Keep responses short (2–3 paragraphs max)
- Use simple, human language
- Give at most ONE suggestion
- End with ONE gentle question

CONTEXT:
Emotion: {emotion}
Trend: {trend}
Risk: {risk_level}
PHQ-9: {phq9}
GAD-7: {gad7}

BEHAVIOR:
- Sad/anxious → empathy + calming idea
- Improving → encourage progress
- Deteriorating → grounding suggestion
- High risk → supportive tone

Never say you cannot access emotions.
"""


def get_client():
    global client
    if client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError("GROQ_API_KEY not set")
        client = Groq(api_key=key)
    return client


def build_system(ctx: dict):
    traj = ctx.get("trajectory", {})
    return SYSTEM_TEMPLATE.format(
        emotion=ctx.get("emotion", "neutral"),
        trend=traj.get("trend", "unknown"),
        risk_level=ctx.get("risk_level", "low"),
        phq9=ctx.get("phq9_score", "N/A"),
        gad7=ctx.get("gad7_score", "N/A"),
    )


def chat(session_id: str, message: str, context=None, rag_context=None):
    gc = get_client()
    ctx = context or {}

    user_msg = message

    if ctx.get("emotion"):
        user_msg = f"(User emotion: {ctx['emotion']})\n{user_msg}"

    if rag_context:
        user_msg = f"(Helpful info: {rag_context[:300]})\n\n{user_msg}"

    if session_id not in sessions:
        sessions[session_id] = [
            {"role": "system", "content": build_system(ctx)}
        ]
    else:
        sessions[session_id][0] = {
            "role": "system",
            "content": build_system(ctx)
        }

    sessions[session_id].append({"role": "user", "content": user_msg})

    try:
        resp = gc.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=sessions[session_id],
            temperature=0.7,
            max_tokens=300,
        )
        reply = resp.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq error: {e}")
        reply = "I'm here with you. Tell me more about what's going on."

    sessions[session_id].append({"role": "assistant", "content": reply})

    if len(sessions[session_id]) > 40:
        sessions[session_id] = [sessions[session_id][0]] + sessions[session_id][-39:]

    return reply


def get_history(sid: str):
    return [m for m in sessions.get(sid, []) if m["role"] != "system"]


def clear_session(sid: str):
    sessions.pop(sid, None)