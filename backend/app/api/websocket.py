# backend/app/api/websocket.py
import asyncio
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

log = logging.getLogger("ws")
log.setLevel(logging.INFO)

# This module expects ACTIVE_JOBS and JOB_CLIENTS to be *owned* by main.py
# and passed into functions that need them. We keep the functions synchronous
# where main.py expects them to be, but any async sends are scheduled/awaited
# properly to avoid "coroutine was never awaited" or early socket close issues.

def ws_register(ws: WebSocket):
    """Register socket globally if needed (no-op but logged)."""
    log.info("🟢 WS connected")


def ws_unregister(ws: WebSocket, JOB_CLIENTS: Dict[str, List[WebSocket]]):
    """Remove disconnected WebSocket from all job pools."""
    removed = 0
    for job_id, clients in JOB_CLIENTS.items():
        if ws in clients:
            clients.remove(ws)
            removed += 1
    log.info(f"🔴 WS disconnected (removed from {removed} job(s))")


def ws_join_job(ws: WebSocket, job_id: str, ACTIVE_JOBS: Dict[str, List[dict]], JOB_CLIENTS: Dict[str, List[WebSocket]]):
    """
    Join a WebSocket to a specific job.

    This function is synchronous because main.py currently calls it
    synchronously. To send any existing partials we spawn a background task
    that awaits the async send_json calls — this prevents 'coroutine not awaited'
    errors and avoids blocking the main receive loop.
    """
    # ensure list exists and deduplicate
    clients = JOB_CLIENTS.setdefault(job_id, [])
    if ws not in clients:
        clients.append(ws)
        log.info(f"➕ WS added to job {job_id} (clients={len(clients)})")
    else:
        log.info(f"➕ WS already member of job {job_id}")

    # schedule sending existing partials (if any). We schedule as a task
    # to avoid blocking, and to properly await send_json inside that task.
    partials = list(ACTIVE_JOBS.get(job_id, []))
    if partials:
        asyncio.create_task(_send_partials_to_ws(ws, partials))


async def _send_partials_to_ws(ws: WebSocket, partials: List[dict]):
    """Async helper to send existing partials to a single ws safely."""
    for f in partials:
        try:
            await ws.send_json({"type": "partial", "data": f})
            # small pause in case the client needs it (keeps UI smooth)
            await asyncio.sleep(0.02)
        except Exception as e:
            # If send fails (client gone), swallow but log for debugging.
            log.warning(f"Failed to send partial to ws: {e}")
            break


async def ws_send_partial(job_id: str, factor: dict, JOB_CLIENTS: Dict[str, List[WebSocket]]):
    """Send a single factor to all sockets in this job."""
    clients = list(JOB_CLIENTS.get(job_id, []))
    if not clients:
        # nothing to send — just log for debugging
        log.debug(f"No clients to send partial for job {job_id}")
        return

    for ws in clients:
        try:
            await ws.send_json({"type": "partial", "data": factor})
        except Exception as e:
            log.warning(f"Error sending partial to ws in job {job_id}: {e}")
            # on send error, remove the ws from the client list to avoid repeated errors
            try:
                JOB_CLIENTS[job_id].remove(ws)
            except Exception:
                pass


async def ws_send_final(job_id: str, factors: list, JOB_CLIENTS: Dict[str, List[WebSocket]]):
    """Send final full list to all sockets in the job and keep ACTIVE_JOBS updated by caller."""
    clients = list(JOB_CLIENTS.get(job_id, []))
    if not clients:
        log.debug(f"No clients to send final for job {job_id}")
        return

    for ws in clients:
        try:
            await ws.send_json({"type": "final", "data": factors})
        except Exception as e:
            log.warning(f"Error sending final to ws in job {job_id}: {e}")
            try:
                JOB_CLIENTS[job_id].remove(ws)
            except Exception:
                pass
