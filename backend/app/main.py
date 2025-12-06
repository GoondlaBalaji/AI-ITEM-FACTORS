# backend/app/main.py
import os
import asyncio
from uuid import uuid4
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env from backend/.env (works locally – on Render you will use real env vars)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

from app.services.llm_service import get_factors  # ← uses GROQ_API_KEY inside llm_service
from app.api.websocket import (
    ws_register,
    ws_unregister,
    ws_join_job,
    ws_send_partial,
    ws_send_final,
)

# ------------------------
# FastAPI App
# ------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    item: str

# In-memory runtime stores
ACTIVE_JOBS = {}       # job_id -> list of factors
JOB_CLIENTS = {}       # job_id -> [WebSocket]


# ✅ Simple health route for Render testing
@app.get("/")
def health():
    return {"status": "ok", "message": "Backend is running"}


# ------------------------
# API: Start a job
# ------------------------
@app.post("/api/query")
async def start_query(body: QueryRequest):
    job_id = str(uuid4())

    ACTIVE_JOBS[job_id] = []
    JOB_CLIENTS[job_id] = []

    asyncio.create_task(run_job(job_id, body.item))

    print(f"🔥 NEW JOB: {job_id} — {body.item}")
    return {"job_id": job_id}


# ------------------------
# WebSocket: Join job
# ------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_register(ws)

    try:
        while True:
            msg = await ws.receive_json()

            if msg.get("type") == "join":
                job_id = msg.get("job_id")
                print(f"🟢 Client joined {job_id}")
                ws_join_job(ws, job_id, ACTIVE_JOBS, JOB_CLIENTS)

    except WebSocketDisconnect:
        ws_unregister(ws, JOB_CLIENTS)
        print("🔴 WS disconnected")


# ------------------------
# JOB Processor
# ------------------------
async def run_job(job_id: str, item: str):
    print(f"🤖 Processing job {job_id}")

    # 1. Fetch REAL factors from Groq
    factors = get_factors(item)

    # fallback in case Groq fails
    if not factors:
        factors = [
            {
                "rank": i + 1,
                "name": f"Fallback {i+1}",
                "effect_short": "N/A",
                "direction": "increases",
            }
            for i in range(10)
        ]

    # 2. Stream factor-by-factor
    for f in factors:
        ACTIVE_JOBS[job_id].append(f)
        await ws_send_partial(job_id, f, JOB_CLIENTS)
        await asyncio.sleep(0.25)

    # 3. Send final list
    await ws_send_final(job_id, factors, JOB_CLIENTS)
    print(f"✅ Job finished: {job_id}")
