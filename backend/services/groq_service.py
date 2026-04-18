"""
Groq service — streaming + non-streaming support.
"""
import os
import logging
from groq import Groq
from typing import Dict, List, Optional

logger  = logging.getLogger("mindcare.groq")
client: Optional[Groq] = None
sessions: Dict[str, List[Dict]] = {}

SYSTEM_TEMPLATE = """You are MindCare, a compassionate AI mental health assistant.

RESPONSE STYLE — CRITICAL:
- Be concise. 2-3 short paragraphs MAX.
- Use plain, warm, human language — not clinical.
- End with ONE simple question or invitation.
- Never list more than 2-3 suggestions at once.

YOUR ROLE:
- Listen first, then gently offer one practical idea.
- Offer evidence-based coping (CBT, mindfulness, breathing).
- Recommend professional help when needed — briefly.
- NEVER diagnose or prescribe.

CRISIS PROTOCOL — suicidal ideation ONLY:
Provide: iCall (India): 9152987821 | AASRA: 9820466627

CURRENT USER CONTEXT:
Risk Level: {risk_level} | PHQ-9: {phq9_score}/27 ({phq9_category}) | GAD-7: {gad7_score}/21 ({gad7_category}) | Emotion: {emotion} | Trajectory: {trajectory}

Calibrate empathy based on context. Keep it SHORT and RELEVANT."""


def get_client() -> Groq:
    global client
    if client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        client = Groq(api_key=api_key)
    return client


def build_system(context: dict) -> str:
    traj = context.get("trajectory", {})
    return SYSTEM_TEMPLATE.format(
        risk_level    = context.get("risk_level",    "UNKNOWN"),
        phq9_score    = context.get("phq9_score",    "N/A"),
        phq9_category = context.get("phq9_category", "Not assessed"),
        gad7_score    = context.get("gad7_score",    "N/A"),
        gad7_category = context.get("gad7_category", "Not assessed"),
        emotion       = context.get("emotion",       "neutral"),
        trajectory    = traj.get("trend", "unknown") if traj else "unknown",
    )


def chat(session_id: str, message: str, context: dict = None, rag_context: str = None) -> str:
    groq_client = get_client()

    if session_id not in sessions:
        sessions[session_id] = [{"role": "system", "content": build_system(context or {})}]
    elif context:
        sessions[session_id][0] = {"role": "system", "content": build_system(context)}

    user_content = message
    if rag_context:
        user_content = f"[Relevant info: {rag_context[:400]}]\n\nUser: {message}"

    sessions[session_id].append({"role": "user", "content": user_content})

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",   # Faster than 70b for real-time chat
        messages=sessions[session_id],
        temperature=0.7,
        max_tokens=300,
    )

    reply = response.choices[0].message.content
    sessions[session_id].append({"role": "assistant", "content": reply})

    # Keep memory bounded
    if len(sessions[session_id]) > 41:
        sessions[session_id] = [sessions[session_id][0]] + sessions[session_id][-40:]

    return reply


def get_history(session_id: str) -> list:
    return [m for m in sessions.get(session_id, []) if m["role"] != "system"]


def clear_session(session_id: str):
    sessions.pop(session_id, None)