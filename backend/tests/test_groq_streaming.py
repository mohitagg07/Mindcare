"""Streaming contract tests use a fake Groq client and never call the network."""
import asyncio
from types import SimpleNamespace

import pytest

from services import groq_service


def chunk(delta):
    return SimpleNamespace(choices=[SimpleNamespace(delta=delta)])


class FakeCompletions:
    def __init__(self, streams):
        self.streams = list(streams)
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        items = self.streams.pop(0)

        async def response():
            for item in items:
                yield item

        return response()


class FakeClient:
    def __init__(self, streams):
        self.chat = SimpleNamespace(completions=FakeCompletions(streams))


def test_stream_reply_emits_incremental_text_and_metadata(monkeypatch):
    client = FakeClient([
        [chunk(SimpleNamespace(content="A small step ", tool_calls=[])), chunk(SimpleNamespace(content="can help.", tool_calls=[]))],
    ])
    monkeypatch.setattr(groq_service, "get_client", lambda: client)
    events = asyncio.run(_collect(groq_service.stream_reply("I feel overwhelmed")))
    assert [event["text"] for event in events if event["type"] == "delta"] == ["A small step ", "can help."]
    assert events[-1] == {"type": "meta", "tools_used": [], "response": "A small step can help."}
    assert client.chat.completions.calls[0]["stream"] is True


def test_stream_reply_assembles_tool_arguments_then_streams_final_answer(monkeypatch):
    first_tool_delta = SimpleNamespace(
        index=0, id="call_grounding", function=SimpleNamespace(name="suggest_grounding_", arguments='{"exercise":')
    )
    second_tool_delta = SimpleNamespace(
        index=0, id=None, function=SimpleNamespace(name="exercise", arguments='"five_senses"}')
    )
    client = FakeClient([
        [chunk(SimpleNamespace(content=None, tool_calls=[first_tool_delta])), chunk(SimpleNamespace(content=None, tool_calls=[second_tool_delta]))],
        [chunk(SimpleNamespace(content="Name five things you can see.", tool_calls=[]))],
    ])
    ran_tools = []

    async def run_tool(name, arguments):
        ran_tools.append((name, arguments))
        return "A grounding prompt."

    monkeypatch.setattr(groq_service, "get_client", lambda: client)
    monkeypatch.setattr(groq_service, "_run_tool", run_tool)
    events = asyncio.run(_collect(groq_service.stream_reply("Can you give me a grounding exercise?")))
    assert ran_tools == [("suggest_grounding_exercise", {"exercise": "five_senses"})]
    assert "".join(event["text"] for event in events if event["type"] == "delta") == "Name five things you can see."
    assert events[-1]["tools_used"] == ["suggest_grounding_exercise"]
    assert len(client.chat.completions.calls) == 2
    assert client.chat.completions.calls[1]["tool_choice"] == "none"


def test_stream_reply_rejects_empty_model_output(monkeypatch):
    monkeypatch.setattr(groq_service, "get_client", lambda: FakeClient([[]]))
    with pytest.raises(RuntimeError, match="empty response"):
        asyncio.run(_collect(groq_service.stream_reply("Hello")))


async def _collect(events):
    return [event async for event in events]
