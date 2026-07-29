"""FastAPI surface for the MotherBridge kernel.

Run:  pip install fastapi uvicorn  &&  uvicorn app:app --port 8080
The core package (motherbridge/) has no external dependencies; only this HTTP
surface needs FastAPI.
"""
from __future__ import annotations

from motherbridge import Kernel
from motherbridge.models import Event, MemoryRecord

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "FastAPI is required to run the kernel HTTP surface: pip install fastapi uvicorn"
    ) from exc


kernel = Kernel().boot()
app = FastAPI(title="MotherBridge Kernel", version="0.1.0")


class MemoryValue(BaseModel):
    value: object


class RouteRequest(BaseModel):
    intent: str


class EventIn(BaseModel):
    topic: str
    payload: dict = {}


@app.get("/kernel/health")
def health():
    return kernel.health.status()


@app.get("/kernel/agents")
def agents():
    return [a.__dict__ for a in kernel.agents()]


@app.get("/kernel/prompts/{agent_id}")
def prompt(agent_id: str):
    doc = kernel.library.get(agent_id)
    if not doc:
        raise HTTPException(404, "unknown agent")
    return {"id": doc.id, "name": doc.name, "title": doc.title,
            "version": kernel.resolve_version(agent_id)}


@app.post("/kernel/prompts/{agent_id}/pin")
def pin(agent_id: str, version: str):
    kernel.versions.pin(agent_id, version)
    return {"id": agent_id, "pinned": version}


@app.get("/kernel/memory/{scope}/{key}")
def mem_get(scope: str, key: str):
    return {"scope": scope, "key": key, "value": kernel.memory.get(scope, key)}


@app.put("/kernel/memory/{scope}/{key}")
def mem_put(scope: str, key: str, body: MemoryValue):
    decision = kernel.policy.check("api", "write", f"{scope}/{key}")
    if decision.kind == "deny":
        raise HTTPException(403, decision.reason)
    kernel.memory.put(scope, key, body.value)
    kernel.memory.append(scope, MemoryRecord(scope=scope, kind="memory.put", data={"key": key}))
    return {"ok": True, "policy": decision.kind, "reason": decision.reason}


@app.post("/kernel/route")
def route(req: RouteRequest):
    return {"intent": req.intent, "agent_id": kernel.router.route(req.intent)}


@app.post("/kernel/events")
def publish(evt: EventIn):
    kernel.bus.publish(Event(topic=evt.topic, payload=evt.payload))
    return {"ok": True}
