"""Tests for explicit, owner-scoped assessment follow-up context in chat."""
from __future__ import annotations
import asyncio
import uuid
import pytest
from fastapi import HTTPException
import routers.chat as chat_router
from db.supabase import SupabaseError

USER_ID = "11111111-1111-4111-8111-111111111111"
TOKEN = "test-assessment-follow-up-token"
ASSESSMENT_ID = uuid.UUID("22222222-2222-4222-8222-222222222222")

def test_follow_up_loads_minimal_owner_scoped_summary(monkeypatch):
    calls = []
    async def fake_select(table, token, params):
        calls.append((table, token, params))
        return ([{"id":str(ASSESSMENT_ID),"instrument":"PHQ-9","score":6,"max_score":27,
                  "result_snapshot":{"category":"Mild","crisis_flag":False,"answers":[3]*9},
                  "answers":[3]*9}], None)
    monkeypatch.setattr(chat_router,"select_rows",fake_select)
    result = asyncio.run(chat_router._load_assessment_follow_up(USER_ID,TOKEN,ASSESSMENT_ID))
    assert result == {"title":"Mood & interest check-in","score":6,"max_score":27,"category":"Mild"}
    table,token,params=calls[0]
    assert table=="assessments" and token==TOKEN
    assert params["user_id"]==f"eq.{USER_ID}" and params["id"]==f"eq.{ASSESSMENT_ID}"
    assert "answers" not in params["select"]

def test_follow_up_is_owner_scoped_and_not_found_is_404(monkeypatch):
    async def fake_select(*args,**kwargs): return ([],None)
    monkeypatch.setattr(chat_router,"select_rows",fake_select)
    with pytest.raises(HTTPException) as err: asyncio.run(chat_router._load_assessment_follow_up(USER_ID,TOKEN,ASSESSMENT_ID))
    assert err.value.status_code==404

def test_follow_up_fails_closed_on_database_error(monkeypatch):
    async def fake_select(*args,**kwargs): raise SupabaseError(503,"database unavailable")
    monkeypatch.setattr(chat_router,"select_rows",fake_select)
    with pytest.raises(HTTPException) as err: asyncio.run(chat_router._load_assessment_follow_up(USER_ID,TOKEN,ASSESSMENT_ID))
    assert err.value.status_code==503

def test_positive_final_item_is_not_exposed_as_ordinary_reflection(monkeypatch):
    async def fake_select(*args,**kwargs):
        return ([{"id":str(ASSESSMENT_ID),"instrument":"PHQ-9","score":1,"max_score":27,
                  "result_snapshot":{"category":"Minimal","crisis_flag":True}}],None)
    monkeypatch.setattr(chat_router,"select_rows",fake_select)
    with pytest.raises(HTTPException) as err: asyncio.run(chat_router._load_assessment_follow_up(USER_ID,TOKEN,ASSESSMENT_ID))
    assert err.value.status_code==409
